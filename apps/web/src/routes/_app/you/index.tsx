import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

export const Route = createFileRoute("/_app/you/")({
  beforeLoad: (args) => {
    requireSignedInBeforeLoad(args);
    throw redirect({ to: "/you/applications" });
  },
  component: () => null,
});
