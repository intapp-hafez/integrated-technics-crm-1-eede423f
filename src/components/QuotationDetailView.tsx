import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState } from "@/lib/store";
import { shortId } from "@/lib/utils";
import { CopyIdButton } from "@/components/CopyIdButton";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { fmtMoney } from "@/lib/mock-data";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  User,
  FileBadge,
  CheckCircle2,
  Clock,
  CalendarClock,
  ListChecks,
  History as HistoryIcon,
  UserCheck,
  Send,
  ExternalLink,
  Pencil,
  Activity as ActivityIcon,
  Phone as PhoneIcon,
  Users as UsersIcon,
  StickyNote,
} from "lucide-react";
import { useMemo, useState } from "react";

type Panel = "admin" | "manager" | "employee" | "finance";

interface Props {
  quotationId: string;
  panel: Panel;
  user: { name: string; role: string; initials: string; photo?: string };
  backTo: string;
  backSearch?: Record<string, string>;
  leadDetailRoute?: string;
  showOdoo?: boolean;
}

export function QuotationDetailView({
  quotationId,
  panel,
  user,
  backTo,
  backSearch,
  leadDetailRoute,
  showOdoo,
}: Props) {
  const { dir } = useI18n();
  const { quotations, leads, employees, users, history, activities } = useStoreState();
  const quotation = quotations.find((q) => q.id === quotationId || (q as any).uuid === quotationId);
  const [posted, setPosted] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState<string>("");
  const canAct = panel === "admin" || panel === "manager" || panel === "finance";
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["supabase-sync"] });

  const q: any = quotation ?? {};
  const lead = leads.find((l: any) => l.id === q.leadId);
  const ownerEmp = employees.find((e: any) => e.name === q.owner);
  const ownerUser = users.find((u: any) => u.name === q.owner || u.id === q.ownerId);
  const ownerPhoto = ownerEmp?.photo ?? ownerUser?.avatarUrl ?? q.ownerPhoto;
  const ownerEmail = ownerEmp?.email ?? ownerUser?.email;
  const ownerPhone = ownerEmp?.phone ?? ownerUser?.phone;
  const ownerRole = ownerEmp?.role ?? ownerUser?.titleEn;
  const ownerDept = ownerEmp?.department ?? ownerUser?.departmentEn;

  const audit = useMemo(() => {
    if (!quotation) return [] as { ts: string; actor: string; action: string; details?: string }[];
    const entries: { ts: string; actor: string; action: string; details?: string }[] = [];
    if (q.createdAt)
      entries.push({
        ts: q.createdAt,
        actor: q.owner,
        action: dir === "rtl" ? "تم إنشاء العرض" : "Quotation created",
      });
    if (q.approvedAt)
      entries.push({
        ts: q.approvedAt,
        actor: q.approvedByName ?? "—",
        action: dir === "rtl" ? "تمت الموافقة" : "Approved",
      });
    for (const h of history as any[]) {
      const match =
        h.targetId === q.uuid ||
        (h.target && (h.target.includes(q.id) || (q.code && h.target.includes(q.code))));
      if (match) entries.push({ ts: h.ts, actor: h.actor, action: h.action, details: h.details });
    }
    return entries
      .filter((e) => !!e.ts)
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [history, quotation, dir]);

  if (!quotation) {
    return (
      <AppShell panel={panel} user={user} pageTitle={dir === "rtl" ? "غير موجود" : "Not Found"}>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-xl font-bold">
            {dir === "rtl" ? "العرض غير موجود" : "Quotation not found"}
          </h2>
          <Link
            to={backTo as any}
            search={backSearch as any}
            className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> {dir === "rtl" ? "العودة" : "Back"}
          </Link>
        </div>
      </AppShell>
    );
  }

  const statusTone: Record<string, string> = {
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    pending_approval: "bg-amber-100 text-amber-700",
    negotiating: "bg-blue-100 text-blue-700",
    sent: "bg-sky-100 text-sky-700",
    draft: "bg-secondary text-muted-foreground",
  };

  const itemsTotal = (q.items ?? []).reduce(
    (s: number, it: any) => s + Number(it.total ?? it.qty * it.unitPrice),
    0,
  );
  const description =
    dir === "rtl" ? (q.descriptionAr ?? q.descriptionEn) : (q.descriptionEn ?? q.descriptionAr);
  const title = dir === "rtl" ? (q.titleAr ?? q.titleEn) : (q.titleEn ?? q.titleAr);

  return (
    <AppShell
      panel={panel}
      user={user}
      pageTitle={`${dir === "rtl" ? "العرض" : "Quotation"} ${shortId(q.id)}`}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={backTo as any}
            search={backSearch as any}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <FileBadge className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground inline-flex items-center gap-2">
                {shortId(q.id)}
                <CopyIdButton value={q.id} />
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusTone[q.status] ?? "bg-secondary"}`}
              >
                {q.status.replace("_", " ")}
              </span>
            </div>
            {title && <p className="text-sm font-medium text-foreground mt-0.5">{title}</p>}
            <p className="text-xs text-muted-foreground">
              {dir === "rtl" ? "قُدم في" : "Submitted on"} {q.submissionDate}
              {q.validUntil && (
                <>
                  {" "}
                  · {dir === "rtl" ? "ساري حتى" : "Valid until"} {q.validUntil}
                </>
              )}
              {" · "}
              {q.revisions} {dir === "rtl" ? "مراجعات" : "revisions"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAct && (
            <>
              <button
                onClick={() => {
                  setPriceDraft(String(q.value));
                  setEditingPrice(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                <Pencil className="h-4 w-4" /> {dir === "rtl" ? "تعديل السعر" : "Edit Price"}
              </button>
              <button
                onClick={async () => {
                  await actions.approveQuotation(q.id, user.name);
                  refresh();
                }}
                disabled={q.status === "accepted"}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-brand)] hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {q.status === "accepted"
                  ? dir === "rtl"
                    ? "تمت الموافقة"
                    : "Approved"
                  : panel === "admin"
                    ? dir === "rtl"
                      ? "موافقة الإدارة"
                      : "Approve (Admin)"
                    : panel === "finance"
                      ? dir === "rtl"
                        ? "موافقة المالية"
                        : "Approve (Finance)"
                      : dir === "rtl"
                        ? "موافقة المدير"
                        : "Approve (Manager)"}
              </button>
            </>
          )}
          {showOdoo && (
            <button
              onClick={() => setPosted(true)}
              disabled={posted}
              className="inline-flex items-center gap-2 rounded-lg bg-[#714B67] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition hover:bg-[#5e3e57] disabled:opacity-60"
            >
              <ExternalLink className="h-4 w-4" />
              {posted
                ? dir === "rtl"
                  ? "تم النشر إلى Odoo"
                  : "Posted to Odoo"
                : dir === "rtl"
                  ? "نشر إلى Odoo"
                  : "Post to Odoo"}
            </button>
          )}
        </div>
      </div>

      {editingPrice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditingPrice(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 font-display text-lg font-bold">
              {dir === "rtl" ? "تعديل سعر العرض" : "Edit Quotation Price"}
            </h3>
            <label className="text-xs font-semibold text-muted-foreground">
              {dir === "rtl" ? "القيمة الجديدة" : "New value"}
            </label>
            <input
              type="number"
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {dir === "rtl" ? "سيُحتسب كمراجعة جديدة." : "Will be recorded as a new revision."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingPrice(false)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary"
              >
                {dir === "rtl" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={async () => {
                  const v = Number(priceDraft);
                  if (!isNaN(v) && v > 0) {
                    await actions.updateQuotation(q.id, { value: v }, user.name);
                    setEditingPrice(false);
                    refresh();
                  }
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {dir === "rtl" ? "حفظ" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-foreground">
              <Building2 className="h-4 w-4 text-primary" />{" "}
              {dir === "rtl" ? "معلومات العميل" : "Client Info"}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="font-semibold text-foreground">{q.client}</div>
              {lead && (
                <>
                  <Row
                    icon={User}
                    label={dir === "rtl" ? "جهة الاتصال" : "Contact"}
                    value={lead.contact}
                  />
                  <Row
                    icon={Building2}
                    label={dir === "rtl" ? "القطاع" : "Industry"}
                    value={lead.industry}
                  />
                  {lead.email && <Row icon={Mail} label="Email" value={lead.email} />}
                  {lead.city && (
                    <Row
                      icon={Phone}
                      label={dir === "rtl" ? "المدينة" : "City"}
                      value={lead.city}
                    />
                  )}
                  {leadDetailRoute && (
                    <div className="mt-3">
                      <Link
                        to={leadDetailRoute as any}
                        params={{ leadId: lead.id } as any}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {dir === "rtl" ? "عرض ملف العميل الكامل" : "View full lead profile"} →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-foreground">
              <UserCheck className="h-4 w-4 text-primary" />{" "}
              {dir === "rtl" ? "المسؤول" : "Quotation Owner"}
            </h3>
            <div className="flex items-start gap-3">
              {ownerPhoto ? (
                <img
                  src={ownerPhoto}
                  alt={q.owner}
                  className="h-14 w-14 rounded-xl object-cover ring-2 ring-primary/30"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
                  {(q.owner || "?")
                    .split(" ")
                    .map((s: string) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              <div className="text-sm">
                <div className="font-semibold text-foreground">{q.owner}</div>
                {ownerRole && <div className="text-xs text-muted-foreground">{ownerRole}</div>}
                {ownerDept && <div className="text-xs text-muted-foreground">{ownerDept}</div>}
                {ownerEmail && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <Mail className="h-3 w-3 text-primary" />
                    {ownerEmail}
                  </div>
                )}
                {ownerPhone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="h-3 w-3 text-primary" />
                    {ownerPhone}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-card p-5 shadow-[var(--shadow-soft)]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {dir === "rtl" ? "قيمة العرض" : "Quotation Value"}
            </div>
            <div className="mt-1 font-mono text-3xl font-bold text-primary">
              {fmtMoney(q.value)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{q.currency ?? "SAR"}</div>
            {description && (
              <p className="mt-3 rounded-lg bg-background/60 p-3 text-xs italic text-muted-foreground whitespace-pre-line">
                {description}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              {q.createdAt && (
                <div>
                  <CalendarClock className="inline h-3 w-3" /> {dir === "rtl" ? "أُنشئ" : "Created"}
                  : {q.createdAt.slice(0, 10)}
                </div>
              )}
              {q.updatedAt && (
                <div>
                  <CalendarClock className="inline h-3 w-3" /> {dir === "rtl" ? "تحديث" : "Updated"}
                  : {q.updatedAt.slice(0, 10)}
                </div>
              )}
              {q.approvedAt && (
                <div className="col-span-2">
                  <CheckCircle2 className="inline h-3 w-3 text-emerald-600" />{" "}
                  {dir === "rtl" ? "اعتُمد" : "Approved"}: {q.approvedAt.slice(0, 10)}{" "}
                  {q.approvedByName && `· ${q.approvedByName}`}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-foreground">
              <ListChecks className="h-4 w-4 text-primary" />{" "}
              {dir === "rtl" ? "بنود العرض" : "Line Items"}
            </h3>
            {(q.items?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                {dir === "rtl"
                  ? "لا توجد بنود مسجلة لهذا العرض."
                  : "No line items recorded for this quotation."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60">
                    <tr>
                      <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase text-muted-foreground">
                        {dir === "rtl" ? "البند" : "Item"}
                      </th>
                      <th className="px-3 py-2 text-end text-[11px] font-semibold uppercase text-muted-foreground">
                        {dir === "rtl" ? "الكمية" : "Qty"}
                      </th>
                      <th className="px-3 py-2 text-end text-[11px] font-semibold uppercase text-muted-foreground">
                        {dir === "rtl" ? "سعر الوحدة" : "Unit"}
                      </th>
                      <th className="px-3 py-2 text-end text-[11px] font-semibold uppercase text-muted-foreground">
                        {dir === "rtl" ? "الإجمالي" : "Total"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {q.items.map((it: any) => {
                      const name =
                        dir === "rtl" ? (it.nameAr ?? it.nameEn) : (it.nameEn ?? it.nameAr);
                      const desc =
                        dir === "rtl"
                          ? (it.descriptionAr ?? it.descriptionEn)
                          : (it.descriptionEn ?? it.descriptionAr);
                      return (
                        <tr key={it.id}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-foreground">{name}</div>
                            {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
                          </td>
                          <td className="px-3 py-2 text-end font-mono">{it.qty}</td>
                          <td className="px-3 py-2 text-end font-mono">{fmtMoney(it.unitPrice)}</td>
                          <td className="px-3 py-2 text-end font-mono font-bold">
                            {fmtMoney(it.total)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-secondary/40">
                      <td colSpan={3} className="px-3 py-2 text-end text-xs font-bold uppercase">
                        {dir === "rtl" ? "المجموع" : "Subtotal"}
                      </td>
                      <td className="px-3 py-2 text-end font-mono font-bold text-primary">
                        {fmtMoney(itemsTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <QuotationActivities activities={activities} leadId={q.leadId} dir={dir} />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-foreground">
              <HistoryIcon className="h-4 w-4 text-primary" />{" "}
              {dir === "rtl" ? "سجل العرض" : "Audit Timeline"}
            </h3>
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {dir === "rtl" ? "لا يوجد سجل بعد." : "No audit entries yet."}
              </p>
            ) : (
              <ol className="relative space-y-4 ps-6">
                <span
                  className="absolute bottom-2 top-2 w-px bg-border"
                  style={{ insetInlineStart: "0.625rem" }}
                />
                {audit.map((e, i) => (
                  <li key={i} className="relative">
                    <span
                      className="absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-card"
                      style={{ insetInlineStart: "-1.25rem" }}
                    >
                      <Clock className="h-3 w-3" />
                    </span>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold text-foreground">{e.action}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(e.ts).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{e.actor}</div>
                      {e.details && (
                        <p className="mt-1 text-xs text-muted-foreground">{e.details}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ icon: I, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <I className="h-3.5 w-3.5 text-primary" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function QuotationActivities({
  activities,
  leadId,
  dir,
}: {
  activities: any[];
  leadId?: string;
  dir: string;
}) {
  const related = (activities ?? [])
    .filter((a) => leadId && a.leadId === leadId)
    .sort((a, b) => `${b.dueDate} ${b.time ?? ""}`.localeCompare(`${a.dueDate} ${a.time ?? ""}`));

  const iconFor = (t: string) => {
    const k = String(t || "").toLowerCase();
    if (k === "call") return PhoneIcon;
    if (k === "meeting") return UsersIcon;
    if (k === "email") return Mail;
    if (k === "note") return StickyNote;
    return ActivityIcon;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-foreground">
        <ActivityIcon className="h-4 w-4 text-primary" />{" "}
        {dir === "rtl" ? "أنشطة العرض" : "Quotation Activities"}
        <span className="ms-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {related.length}
        </span>
      </h3>
      {related.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {dir === "rtl"
            ? "لا توجد أنشطة مرتبطة."
            : "No activities linked to this quotation's lead."}
        </p>
      ) : (
        <ul className="space-y-2">
          {related.map((a) => {
            const I = iconFor(a.type);
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-background p-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <I className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground truncate">{a.title}</div>
                    <StatusBadge status={a.status} label={a.status} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {a.type} · {a.dueDate}
                    {a.time ? ` ${a.time}` : ""} · {a.owner}
                  </div>
                  {a.notes && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.notes}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
