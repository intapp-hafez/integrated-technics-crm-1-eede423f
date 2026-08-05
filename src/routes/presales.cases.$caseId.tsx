import { createFileRoute } from "@tanstack/react-router";
import { CaseDetailsPage } from "@/components/presales/CaseDetailsPage";

export const Route = createFileRoute("/presales/cases/$caseId")({
  component: RouteComponent,
  head: ({ params }) => ({ meta: [{ title: `Technical Study ${params.caseId} · INT-CRM` }] }),
});

function RouteComponent() {
  const { caseId } = Route.useParams();
  return <CaseDetailsPage caseId={caseId} />;
}
