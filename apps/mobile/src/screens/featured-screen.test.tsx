import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  FeaturedContent,
  type FeaturedSectionState,
} from "@/screens/featured-screen";
import type { EventListItem } from "@/lib/types";

function createEvent(
  id: string,
  overrides: Partial<EventListItem> = {},
): EventListItem {
  return {
    id,
    title: `Event ${id}`,
    description: `Description for ${id}`,
    type: "EVENT",
    source: "USER",
    status: "OPEN",
    category: "music",
    tags: ["music"],
    imageUrl: null,
    ticketUrl: null,
    externalUrl: null,
    locationName: "Ohio Union",
    locationLatitude: null,
    locationLongitude: null,
    startAt: "2026-04-06T17:00:00.000Z",
    endAt: null,
    compensationAmount: null,
    compensationCurrency: null,
    compensationType: null,
    summary: `Summary for ${id}`,
    creatorId: "user_1",
    createdAt: "2026-04-06T12:00:00.000Z",
    updatedAt: "2026-04-06T12:00:00.000Z",
    creator: {
      id: "user_1",
      displayName: "Brutus",
      email: "brutus@osu.edu",
    },
    ...overrides,
  };
}

function createSection(items: EventListItem[]): FeaturedSectionState {
  return {
    items,
    total: items.length,
    isPending: false,
    isError: false,
    errorMessage: null,
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

describe("[phase:6] [regression:always] Mobile Featured", () => {
  it("TC-FEED-011: renders Recommended, Popular, and Upcoming sections", () => {
    render(
      <FeaturedContent
        selectedType="ALL"
        onTypeChange={jest.fn()}
        onOpenEvent={jest.fn()}
        recommendedSection={createSection([createEvent("rec-1")])}
        popularSection={createSection([createEvent("pop-1")])}
        upcomingSection={createSection([createEvent("up-1")])}
        rankingMode="PERSONALIZED"
      />,
    );

    expect(screen.getByText("Recommended")).toBeTruthy();
    expect(screen.getByText("Popular")).toBeTruthy();
    expect(screen.getByText("Upcoming")).toBeTruthy();
    expect(screen.getByText("Event rec-1")).toBeTruthy();
    expect(screen.getByText("Event pop-1")).toBeTruthy();
    expect(screen.getByText("Event up-1")).toBeTruthy();
  });

  it("TC-FEED-012: updates the active filter when the user selects a new type", () => {
    const onTypeChange = jest.fn();

    render(
      <FeaturedContent
        selectedType="ALL"
        onTypeChange={onTypeChange}
        onOpenEvent={jest.fn()}
        recommendedSection={createSection([createEvent("rec-1")])}
        popularSection={createSection([createEvent("pop-1")])}
        upcomingSection={createSection([createEvent("up-1")])}
        rankingMode="PERSONALIZED"
      />,
    );

    fireEvent.press(screen.getByText("Gigs"));

    expect(onTypeChange).toHaveBeenCalledWith("GIG");
  });
});
