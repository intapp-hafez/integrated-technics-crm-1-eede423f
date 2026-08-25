import { createFileRoute } from "@tanstack/react-router";
import { ServicesItemsManager, ItemModal } from "@/components/catalog/ServicesItemsManager";

export const Route = createFileRoute("/admin/services-items")({
  component: AdminCatalogPage,
  head: () => ({ meta: [{ title: "Systems · INT-CRM" }] }),
});

function AdminCatalogPage() {
  return <ServicesItemsManager panel="admin" />;
}

export { ItemModal };
