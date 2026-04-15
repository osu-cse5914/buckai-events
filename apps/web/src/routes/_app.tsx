import { createFileRoute } from "@tanstack/react-router";
import {
  AppShellLayout,
  getVisibleNavLinks,
  getVisibleUtilityNavLinks,
  navLinks,
  utilityNavLinks,
} from "@/components/layout/app-shell";
import { requireSignedInBeforeLoad } from "@/lib/route-access";

export { getVisibleNavLinks, getVisibleUtilityNavLinks, navLinks, utilityNavLinks };

export const Route = createFileRoute("/_app")({
  beforeLoad: requireSignedInBeforeLoad,
  component: AppShellLayout,
});
