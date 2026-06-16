import { createFileRoute, useParams } from "@tanstack/react-router";
import { QuotationDetailView } from "@/components/QuotationDetailView";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/manager/offers/$quotationId")({
  component: Page,
  head: ({ params }) => ({ meta: [{ title: `Quotation ${params.quotationId} · Manager` }] }),
});

function Page() {
  const { quotationId } = useParams({ from: "/manager/offers/$quotationId" });
  const { t } = useI18n();
  return (
    <QuotationDetailView
      quotationId={quotationId}
      panel="manager"
      user={{ name: "Aisha Mahmoud", role: t("manager"), initials: "AM" }}
      backTo="/manager/offers"
      leadDetailRoute="/admin/leads/$leadId"
    />
  );
}
