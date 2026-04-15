import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const YOU_TABS = [
  { value: "applications", label: "Applications", to: "/you/applications" as const },
  { value: "events", label: "Events", to: "/you/events" as const },
  { value: "collections", label: "Collections", to: "/you/collections" as const },
] as const;

export type YouTabValue = (typeof YOU_TABS)[number]["value"];

export function YouTabsNav({ currentTab }: { currentTab: YouTabValue }) {
  return (
    <nav aria-label="You sections" className="flex flex-wrap gap-2">
      {YOU_TABS.map((tab) => {
        const isActive = tab.value === currentTab;

        return (
          <Button
            key={tab.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            asChild
            className={cn("rounded-full px-4", isActive && "pointer-events-none")}
          >
            <Link to={tab.to} aria-current={isActive ? "page" : undefined}>
              {tab.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
