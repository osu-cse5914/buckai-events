import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockEventGet = vi.fn();
const mockApplicationsGet = vi.fn();
const mockApplicationPatch = vi.fn();
const mockUserGet = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    api: {
      v1: {
        events: {
          ":id": {
            $get: (...args: unknown[]) => mockEventGet(...args),
          },
        },
        gigs: {
          ":gigId": {
            applications: {
              $get: (...args: unknown[]) => mockApplicationsGet(...args),
              ":appId": {
                $patch: (...args: unknown[]) => mockApplicationPatch(...args),
              },
            },
          },
        },
        users: {
          me: {
            $get: (...args: unknown[]) => mockUserGet(...args),
          },
        },
      },
    },
  },
}));

let capturedComponent: React.ComponentType | null = null;

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: { component: React.ComponentType }) => {
    capturedComponent = config.component;
    return {
      component: config.component,
      useParams: () => ({ eventId: "evt_1" }),
    };
  },
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a
      href={params?.eventId ? `/events/${params.eventId}` : to}
      {...props}
    >
      {children}
    </a>
  ),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    title: "Need a tutor",
    type: "GIG",
    source: "USER",
    status: "OPEN",
    creatorId: "user_owner",
    description: "Tutoring help needed",
    category: null,
    tags: [],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Thompson Library",
    locationLatitude: null,
    locationLongitude: null,
    startAt: "2026-03-20T14:00:00.000Z",
    endAt: null,
    compensationAmount: 20,
    compensationCurrency: "USD",
    compensationType: "HOURLY",
    summary: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    creator: {
      id: "user_owner",
      displayName: "Owner",
      email: "owner@osu.edu",
    },
    ...overrides,
  };
}

function okJson(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) };
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedComponent = null;
  vi.resetModules();
});

async function renderPage() {
  await import("./index");
  if (!capturedComponent) {
    throw new Error("ManageApplicationsPage component was not captured");
  }
  const Component = capturedComponent;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:2] [regression:always] ManageApplicationsPage", () => {
  it("TC-APP-012: renders applicant info and actions for pending applications", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(
      okJson({ id: "user_owner", email: "owner@osu.edu" }),
    );
    mockApplicationsGet.mockResolvedValue(
      okJson({
        data: [
          {
            id: "app_1",
            status: "PENDING",
            message: "I can help",
            applicant: {
              id: "user_a",
              displayName: "Alice",
              email: "alice@osu.edu",
            },
          },
        ],
        pagination: { total: 1, limit: 20, offset: 0 },
      }),
    );

    await renderPage();

    const card = (await screen.findByText("Alice")).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    expect(within(card).getByText("alice@osu.edu")).toBeInTheDocument();
    expect(within(card).getByText("I can help")).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Accept" }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Reject" }),
    ).toBeInTheDocument();
  });

  it("TC-APP-012: updates application status immediately after an owner decision", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(
      okJson({ id: "user_owner", email: "owner@osu.edu" }),
    );
    mockApplicationsGet.mockResolvedValue(
      okJson({
        data: [
          {
            id: "app_1",
            status: "PENDING",
            message: "I can help",
            applicant: {
              id: "user_a",
              displayName: "Alice",
              email: "alice@osu.edu",
            },
          },
        ],
        pagination: { total: 1, limit: 20, offset: 0 },
      }),
    );
    mockApplicationPatch.mockResolvedValue(
      okJson({
        id: "app_1",
        status: "ACCEPTED",
        message: "I can help",
        applicant: {
          id: "user_a",
          displayName: "Alice",
          email: "alice@osu.edu",
        },
      }),
    );
    const user = userEvent.setup();

    await renderPage();

    const card = (await screen.findByText("Alice")).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "Accept" }));

    await vi.waitFor(() => {
      expect(mockApplicationPatch).toHaveBeenCalledWith({
        param: { gigId: "evt_1", appId: "app_1" },
        json: { status: "ACCEPTED" },
      });
    });
    expect(await within(card).findByText("Accepted")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Accept" })).toBeDisabled();
    expect(within(card).getByRole("button", { name: "Reject" })).toBeDisabled();
  });
});
