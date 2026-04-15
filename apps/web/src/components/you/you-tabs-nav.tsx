import { Link } from "@tanstack/react-router";
import { PillTabButton, PillTabs } from "@/components/ui/pill-tabs";

const YOU_TABS = [
  { value: "applications", label: "Applications", to: "/you/applications" as const },
  { value: "events", label: "Events", to: "/you/events" as const },
  { value: "collections", label: "Collections", to: "/you/collections" as const },
] as const;

export type YouTabValue = (typeof YOU_TABS)[number]["value"];

export function YouTabsNav({ currentTab }: { currentTab: YouTabValue }) {
  return (
    <nav aria-label="You sections">
      <PillTabs>
      {YOU_TABS.map((tab) => {
        const isActive = tab.value === currentTab;

        return (
          <PillTabButton
            key={tab.value}
            active={isActive}
            asChild
          >
            <Link to={tab.to} aria-current={isActive ? "page" : undefined}>
              {tab.label}
            </Link>
          </PillTabButton>
        );
      })}
      </PillTabs>
    </nav>
  );
}
