import { createFileRoute } from "@tanstack/react-router";
import { MyApplicationsPage } from "@/components/you/my-applications-page";

export const Route = createFileRoute("/_authenticated/you/applications/")({
  component: MyApplicationsPage,
});
