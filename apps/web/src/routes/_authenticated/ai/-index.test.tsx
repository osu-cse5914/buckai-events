import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildConversationMessage,
  buildConversationRecord,
  buildPaginatedResponse,
} from "@/test/factories";

const state = vi.hoisted(() => {
  const conversationsGet = vi.fn();
  const conversationsPost = vi.fn();
  const messagesGet = vi.fn();
  const messagesPost = vi.fn();
  const shared = {
    conversationsGet,
    conversationsPost,
    messagesGet,
    messagesPost,
    routeSearch: {} as Record<string, unknown>,
    navigate: vi.fn(),
    mockApiClient: {
      api: {
        v1: {
          conversations: {
            $get: (...args: unknown[]) => conversationsGet(...args),
            $post: (...args: unknown[]) => conversationsPost(...args),
            [":id"]: {
              messages: {
                $get: (...args: unknown[]) => messagesGet(...args),
                $post: (...args: unknown[]) => messagesPost(...args),
              },
            },
          },
        },
      },
    },
  };

  return shared;
});

vi.mock("@/lib/api", () => ({
  api: state.mockApiClient,
  useApiClient: () => state.mockApiClient,
}));

let capturedComponent: React.ComponentType | null = null;
let capturedValidateSearch:
  | ((search: Record<string, unknown>) => Record<string, unknown>)
  | null = null;

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    (path: string) =>
    (config: {
      validateSearch?: (search: Record<string, unknown>) => Record<string, unknown>;
      component: React.ComponentType;
    }) => {
      if (path === "/_authenticated/ai/") {
        capturedComponent = config.component;
        capturedValidateSearch = config.validateSearch ?? null;
      }

      return {
        component: config.component,
        fullPath: path,
        useSearch: () => state.routeSearch,
      };
    },
  useNavigate: () => state.navigate,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function paginated<T>(data: T[]) {
  return buildPaginatedResponse(data);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function sseResponse(chunks: string[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        for (const chunk of chunks) {
          const event = chunk
            .split("\n")
            .map((line) => `data: ${line}\n`)
            .join("")
            .concat("\n");
          controller.enqueue(encoder.encode(event));
        }

        controller.close();
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
      },
    },
  );
}

function makeConversation(overrides: Record<string, unknown> = {}) {
  return buildConversationRecord(overrides);
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return buildConversationMessage(overrides);
}

async function renderAiRoute(search: Record<string, unknown> = {}) {
  state.routeSearch = search;
  await import("./index");

  if (!capturedComponent) {
    throw new Error("AI route component was not captured");
  }

  const Component = capturedComponent;
  const queryClient = createQueryClient();
  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );

  return {
    ...renderResult,
    rerenderRoute(nextSearch: Record<string, unknown>) {
      state.routeSearch = nextSearch;
      renderResult.rerender(
        <QueryClientProvider client={queryClient}>
          <Component />
        </QueryClientProvider>,
      );
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedComponent = null;
  capturedValidateSearch = null;
  state.routeSearch = {};
  vi.resetModules();
});

function getNextSearchFromNavigateCall() {
  const lastCall = state.navigate.mock.lastCall?.[0] as
    | {
        search?:
          | Record<string, unknown>
          | ((current: Record<string, unknown>) => Record<string, unknown>);
      }
    | undefined;

  if (!lastCall?.search) {
    throw new Error("Expected navigate to be called with search");
  }

  return typeof lastCall.search === "function"
    ? lastCall.search(state.routeSearch)
    : lastCall.search;
}

describe("[phase:5] [regression:always] AI Route", () => {
  it("validates optional AI route search state", async () => {
    await import("./index");

    if (!capturedValidateSearch) {
      throw new Error("AI validateSearch was not captured");
    }

    expect(
      capturedValidateSearch({
        conversationId: "  conv_9  ",
        prompt: "  find music events  ",
      }),
    ).toEqual({
      conversationId: "conv_9",
      prompt: "find music events",
    });
    expect(capturedValidateSearch({ conversationId: "", prompt: "" })).toEqual({
      conversationId: undefined,
      prompt: undefined,
    });
  });

  it("TC-CONV-009: renders the conversation sidebar and switches histories", async () => {
    state.conversationsGet.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(
          paginated([
            makeConversation({
              id: "conv_2",
              title: "Most recent",
              updatedAt: "2026-04-01T12:00:00.000Z",
            }),
            makeConversation({ id: "conv_1", title: "Older chat" }),
          ]),
        ),
      ),
    );
    state.messagesGet.mockImplementation(
      ({ param }: { param: { id: string } }) =>
      Promise.resolve(
        jsonResponse(
          paginated(
            param.id === "conv_1"
              ? [
                  makeMessage({
                    id: "msg_4",
                    conversationId: "conv_1",
                    role: "USER",
                    content: "Any quieter options from earlier this week?",
                  }),
                  makeMessage({
                    id: "msg_5",
                    conversationId: "conv_1",
                    role: "ASSISTANT",
                    content: "Here are a few quieter options from earlier this week.",
                  }),
                ]
              : [
                  makeMessage({
                    id: "msg_2",
                    conversationId: "conv_2",
                    role: "USER",
                    content: "What free events are happening this weekend?",
                  }),
                  makeMessage({
                    id: "msg_3",
                    conversationId: "conv_2",
                    role: "ASSISTANT",
                    content: "There are a few free events this weekend.",
                  }),
                ],
          ),
        ),
      ),
    );

    const route = await renderAiRoute({ conversationId: "conv_2" });

    expect(
      await screen.findByRole("button", { name: /Most recent/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("There are a few free events this weekend."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Older chat/ }));

    expect(state.navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    });
    route.rerenderRoute(getNextSearchFromNavigateCall());
    expect(
      await screen.findByText(
        "Here are a few quieter options from earlier this week.",
      ),
    ).toBeInTheDocument();
  });

  it("TC-CHAT-011: creates a conversation on first send and renders the streamed reply", async () => {
    const multilineAssistantReply = [
      "Yes! I found several fitness events on campus. Here are the top matches:",
      "",
      "1. **Group Fitness Classes**",
      "- RPAC / North Rec",
    ].join("\n");

    state.conversationsGet
      .mockImplementationOnce(() => Promise.resolve(jsonResponse(paginated([]))))
      .mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse(
            paginated([makeConversation({ id: "conv_new", title: null })]),
          ),
        ),
      )
      .mockImplementation(() =>
        Promise.resolve(
          jsonResponse(
            paginated([makeConversation({ id: "conv_new", title: null })]),
          ),
        ),
      );
    state.conversationsPost.mockResolvedValue(
      jsonResponse(makeConversation({ id: "conv_new", title: null }), 201),
    );
    state.messagesPost.mockResolvedValue(
      sseResponse([multilineAssistantReply]),
    );
    state.messagesGet.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(
          paginated([
            makeMessage({
              id: "msg_user_new",
              conversationId: "conv_new",
              role: "USER",
              content: "find music tonight",
            }),
            makeMessage({
              id: "msg_assistant_new",
              conversationId: "conv_new",
              role: "ASSISTANT",
              content: multilineAssistantReply,
              parts: [
                {
                  type: "search-results",
                  toolName: "searchEvents",
                  total: 1,
                  items: [
                    {
                      id: "evt_fitness_1",
                      title: "Group Fitness Classes",
                      description: "Free recreation classes for students.",
                      summary: "Join guided campus workouts.",
                      type: "EVENT",
                      category: "fitness",
                      tags: ["fitness"],
                      imageUrl: null,
                      location: {
                        name: "RPAC / North Rec",
                        latitude: null,
                        longitude: null,
                      },
                      startAt: "2026-04-02T18:00:00.000Z",
                      endAt: null,
                      compensation: null,
                    },
                  ],
                },
              ],
            }),
          ]),
        ),
      ),
    );

    const route = await renderAiRoute({ prompt: "find music tonight" });

    const input = await screen.findByLabelText("Message");
    expect(input).toHaveValue("find music tonight");

    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(state.conversationsPost).toHaveBeenCalledTimes(1);
    });
    route.rerenderRoute(getNextSearchFromNavigateCall());
    await waitFor(() => {
      expect(state.messagesPost).toHaveBeenCalledWith({
        param: { id: "conv_new" },
        json: { content: "find music tonight" },
      });
    });
    expect(
      await screen.findByText("Group Fitness Classes", { selector: "strong" }),
    ).toBeInTheDocument();
    const eventCard = screen.getByRole("link", {
      name: /Group Fitness Classes/i,
    });
    expect(eventCard).toHaveAttribute("href", "/events/evt_fitness_1");
    expect(within(eventCard).getByText("RPAC / North Rec")).toBeInTheDocument();
  });
});

describe("[phase:6] [regression:always] AI prompt carryover", () => {
  it("TC-PAGES-024: preserves a carried prompt draft and lets the user edit it before sending", async () => {
    state.conversationsGet.mockResolvedValue(jsonResponse(paginated([])));

    await renderAiRoute({ prompt: "find music tonight" });

    const user = userEvent.setup();
    const input = await screen.findByLabelText("Message");
    expect(input).toHaveValue("find music tonight");

    await user.clear(input);
    await user.type(input, "find jazz tomorrow");

    expect(input).toHaveValue("find jazz tomorrow");
    expect(state.conversationsPost).not.toHaveBeenCalled();
    expect(state.messagesPost).not.toHaveBeenCalled();
  });
});
