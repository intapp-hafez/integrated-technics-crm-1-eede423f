import { createFileRoute, useParams } from "@tanstack/react-router";
import { QuotationDetailView } from "@/components/QuotationDetailView";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";

export const Route = createFileRoute("/employee/offers/$quotationId")({
  component: Page,
  head: ({ params }) => ({ meta: [{ title: `Quotation ${params.quotationId} · INT-CRM` }] }),
});

function Page() {
  const { quotationId } = useParams({ from: "/employee/offers/$quotationId" });
  const { t } = useI18n();
  const { profile } = useStoreState();
  const initials = profile.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <QuotationDetailView
      quotationId={quotationId}
      panel="employee"
      user={{ name: profile.name, role: t("employee"), initials, photo: profile.avatarUrl }}
      backTo="/employee/offers"
      leadDetailRoute="/employee/leads/$leadId"
    />
  );
}
