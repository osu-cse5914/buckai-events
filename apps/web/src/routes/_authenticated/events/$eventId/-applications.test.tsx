import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockEventGet = vi.fn();
const mockGigApplicationsGet = vi.fn();
const mockGigApplicationsPost = vi.fn();
const mockUserGet = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    api: {
      v1: {
        events: {
          ":id": {
            $get: (...args: unknown[]) => mockEventGet(...args),
            $patch: vi.fn(),
            $delete: vi.fn(),
          },
        },
        gigs: {
          ":gigId": {
            applications: {
              $get: (...args: unknown[]) => mockGigApplicationsGet(...args),
              $post: (...args: unknown[]) => mockGigApplicationsPost(...args),
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
  }) => {
    let href = to;
    if (params?.id) href = `/users/${params.id}`;
    if (params?.eventId && to === "/events/$eventId/edit") {
      href = `/events/${params.eventId}/edit`;
    }
    if (params?.eventId && to === "/events/$eventId/applications") {
      href = `/events/${params.eventId}/applications`;
    }
    if (params?.eventId && to === "/events/$eventId") {
      href = `/events/${params.eventId}`;
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
  useNavigate: () => vi.fn(),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    title: "Hackathon",
    description: "A 24-hour hackathon at Ohio Union",
    type: "GIG",
    source: "USER",
    status: "OPEN",
    category: "tech",
    tags: ["coding", "hackathon"],
    imageUrl: null,
    ticketUrl: null,
    locationName: "Ohio Union",
    locationLatitude: null,
    locationLongitude: null,
    startAt: "2025-04-01T09:00:00.000Z",
    endAt: "2025-04-02T09:00:00.000Z",
    compensationAmount: 25,
    compensationCurrency: "USD",
    compensationType: "HOURLY",
    summary: "A hackathon event",
    creatorId: "user_1",
    createdAt: "2025-03-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
    creator: { id: "user_1", displayName: "Alice", email: "alice@osu.edu" },
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
  if (!capturedComponent) throw new Error("Component not captured");
  const Component = capturedComponent;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("[phase:2] [regression:always] EventDetailPage Gig Applications", () => {
  it("TC-APP-010: non-owners on gig detail can open the apply modal", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson({ id: "user_2", email: "bob@osu.edu" }));
    mockGigApplicationsGet.mockResolvedValue(
      okJson({ data: [], pagination: { total: 0, limit: 20, offset: 0 } }),
    );
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Apply to this gig")).toBeInTheDocument();
    expect(screen.getByLabelText("Message (optional)")).toBeInTheDocument();
  });

  it("TC-APP-010: submitting the apply modal posts the application and disables re-apply", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson({ id: "user_2", email: "bob@osu.edu" }));
    mockGigApplicationsGet
      .mockResolvedValueOnce(
        okJson({ data: [], pagination: { total: 0, limit: 20, offset: 0 } }),
      )
      .mockResolvedValueOnce(
        okJson({
          data: [
            {
              id: "app_1",
              status: "PENDING",
              message: "I can help",
            },
          ],
          pagination: { total: 1, limit: 20, offset: 0 },
        }),
      );
    mockGigApplicationsPost.mockResolvedValue(
      okJson({ id: "app_1", status: "PENDING", message: "I can help" }),
    );
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    await user.click(screen.getByRole("button", { name: "Apply" }));
    await user.type(screen.getByLabelText("Message (optional)"), "I can help");
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    await vi.waitFor(() => {
      expect(mockGigApplicationsPost).toHaveBeenCalledWith({
        param: { gigId: "evt_1" },
        json: { message: "I can help" },
      });
    });
    expect(await screen.findByText("Application submitted.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Applied" })).toBeDisabled();
  });

  it("TC-APP-010: shows API error details when the application is rejected", async () => {
    mockEventGet.mockResolvedValue(okJson(makeEvent()));
    mockUserGet.mockResolvedValue(okJson({ id: "user_2", email: "bob@osu.edu" }));
    mockGigApplicationsGet.mockResolvedValue(
      okJson({ data: [], pagination: { total: 0, limit: 20, offset: 0 } }),
    );
    mockGigApplicationsPost.mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({ detail: "You have already applied to this gig" }),
    });
    const user = userEvent.setup();

    await renderPage();
    await screen.findByText("Hackathon");

    await user.click(screen.getByRole("button", { name: "Apply" }));
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    expect(
      await screen.findByText("You have already applied to this gig"),
    ).toBeInTheDocument();
  });
});
