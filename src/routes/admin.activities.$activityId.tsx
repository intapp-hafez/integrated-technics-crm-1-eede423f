import { createFileRoute } from "@tanstack/react-router";
import { ActivityDetailView } from "@/components/ActivityDetailView";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/admin/activities/$activityId")({
  component: () => {
    const { activityId } = Route.useParams();
    const { role } = useRole();
    return <ActivityDetailView activityId={activityId} panel={role} />;
  },
  head: ({ params }) => ({ meta: [{ title: `${params.activityId} · Activity` }] }),
});
