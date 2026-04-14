import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/you/")({
  beforeLoad: () => {
    throw redirect({ to: "/you/applications" });
  },
  component: () => null,
});
