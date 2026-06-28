import { createFileRoute, useParams } from "@tanstack/react-router";
import { QuotationDetailView } from "@/components/QuotationDetailView";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/finance/quotations/$quotationId")({
  component: Page,
  head: ({ params }) => ({ meta: [{ title: `Quotation ${params.quotationId} · INT-CRM` }] }),
});

function Page() {
  const { quotationId } = useParams({ from: "/finance/quotations/$quotationId" });
  const { dir } = useI18n();
  return (
    <QuotationDetailView
      quotationId={quotationId}
      panel="finance"
      user={{
        name: "Layla Hassan",
        role: dir === "rtl" ? "مالية" : "Finance Officer",
        initials: "LH",
        photo:
          "https://e7.pngegg.com/pngimages/394/133/png-clipart-hijab-muslim-islamic-fashion-woman-islam-tube-girl.png",
      }}
      backTo="/finance"
      backSearch={{ tab: "quotations" }}
      leadDetailRoute="/finance/leads/$leadId"
      showOdoo
    />
  );
}
