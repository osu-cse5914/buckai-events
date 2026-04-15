import { createFileRoute } from "@tanstack/react-router";
import { MyApplicationsPage } from "@/components/you/my-applications-page";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

export const Route = createFileRoute("/_app/you/applications/")({
  beforeLoad: requireSignedInBeforeLoad,
  component: MyApplicationsPage,
});
