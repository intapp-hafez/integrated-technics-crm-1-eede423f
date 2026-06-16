import { createFileRoute, useParams } from "@tanstack/react-router";
import { QuotationDetailView } from "@/components/QuotationDetailView";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/offers/$quotationId")({
  component: Page,
  head: ({ params }) => ({ meta: [{ title: `Quotation ${params.quotationId} · Admin` }] }),
});

function Page() {
  const { quotationId } = useParams({ from: "/admin/offers/$quotationId" });
  const { t } = useI18n();
  return (
    <QuotationDetailView
      quotationId={quotationId}
      panel="admin"
      user={{ name: "hafez Rahim", role: t("admin"), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" }}
      backTo="/admin/offers"
      leadDetailRoute="/admin/leads/$leadId"
    />
  );
}
