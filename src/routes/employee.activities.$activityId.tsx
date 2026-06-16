import { createFileRoute } from "@tanstack/react-router";
import { ActivityDetailView } from "@/components/ActivityDetailView";

export const Route = createFileRoute("/employee/activities/$activityId")({
  component: () => {
    const { activityId } = Route.useParams();
    return <ActivityDetailView activityId={activityId} panel="employee" />;
  },
  head: ({ params }) => ({ meta: [{ title: `${params.activityId} · Activity` }] }),
});
