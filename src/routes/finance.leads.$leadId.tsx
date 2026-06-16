import { createFileRoute } from "@tanstack/react-router";
import { LeadDetailsPage } from "@/components/leads/LeadDetailsPage";

export const Route = createFileRoute("/finance/leads/$leadId")({
  component: RouteComponent,
  head: ({ params }) => ({ meta: [{ title: `${params.leadId} · INT-CRM` }] }),
});

function RouteComponent() {
  const { leadId } = Route.useParams();
  return <LeadDetailsPage leadId={leadId} />;
}
