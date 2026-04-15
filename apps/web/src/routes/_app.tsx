import { createFileRoute } from "@tanstack/react-router";
import {
  AppShellLayout,
  getVisibleNavLinks,
  getVisibleUtilityNavLinks,
  navLinks,
  utilityNavLinks,
} from "@/components/layout/app-shell";

export { getVisibleNavLinks, getVisibleUtilityNavLinks, navLinks, utilityNavLinks };

export const Route = createFileRoute("/_app")({
  component: AppShellLayout,
});
