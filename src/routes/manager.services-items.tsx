import { createFileRoute } from "@tanstack/react-router";
import { ServicesItemsManager } from "@/components/catalog/ServicesItemsManager";

export const Route = createFileRoute("/manager/services-items")({
  component: ManagerCatalogPage,
  head: () => ({ meta: [{ title: "Systems · INT-CRM" }] }),
});

function ManagerCatalogPage() {
  return <ServicesItemsManager panel="manager" />;
}
