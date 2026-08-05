import { createFileRoute } from "@tanstack/react-router";
import { ActivityDetailView } from "@/components/activities/ActivityDetailView";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/admin/activities/$activityId")({
  component: () => {
    const { activityId } = Route.useParams();
    return <ActivityDetailView activityId={activityId} panel="admin" />;
  },
  head: ({ params }) => ({ meta: [{ title: `${params.activityId} · Activity` }] }),
});
