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

function createControlledSseResponse() {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  const response = new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        await released;
        controller.enqueue(
          encoder.encode("data: Here are a few fitness events.\n\n"),
        );
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

  return { response, release };
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

  it("does not duplicate the just-sent user message when it has already persisted during streaming", async () => {
    const controlledStream = createControlledSseResponse();

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
    state.messagesPost.mockResolvedValue(controlledStream.response);
    state.messagesGet.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(
          paginated([
            makeMessage({
              id: "msg_user_new",
              conversationId: "conv_new",
              role: "USER",
              content: "Are there any events about fitness?",
            }),
          ]),
        ),
      ),
    );

    const route = await renderAiRoute({
      prompt: "Are there any events about fitness?",
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(state.conversationsPost).toHaveBeenCalledTimes(1);
    });
    route.rerenderRoute(getNextSearchFromNavigateCall());

    expect(
      await screen.findByText("Are there any events about fitness?"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getAllByText("Are there any events about fitness?"),
      ).toHaveLength(1);
    });

    controlledStream.release();

    expect(
      await screen.findByText("Here are a few fitness events."),
    ).toBeInTheDocument();
  });

  it("TC-CHAT-012: renders mutation confirmation dialogs and sends confirm or cancel through the conversation flow", async () => {
    const user = userEvent.setup();

    let currentConversation = makeConversation({
      id: "conv_apply",
      title: "Gig help",
      pendingAction: {
        id: "pending_apply_1",
        toolName: "applyToGig",
        summary: "Apply to Calculus Tutor",
        args: {
          gigId: "gig_calc_tutor",
          message: "I can tutor evenings after 5 PM.",
        },
      },
    });
    let currentMessages = [
      makeMessage({
        id: "msg_apply_prompt",
        conversationId: "conv_apply",
        role: "ASSISTANT",
        content: "I found a tutoring gig. Want me to apply for you?",
      }),
    ];

    state.conversationsGet.mockImplementation(() =>
      Promise.resolve(jsonResponse(paginated([currentConversation]))),
    );
    state.messagesGet.mockImplementation(() =>
      Promise.resolve(jsonResponse(paginated(currentMessages))),
    );
    state.messagesPost.mockImplementation(
      ({ json }: { json: { content: string } }) => {
        if (json.content === "Confirm") {
          currentConversation = makeConversation({
            id: "conv_apply",
            title: "Gig help",
            pendingAction: null,
          });
          currentMessages = [
            currentMessages[0]!,
            makeMessage({
              id: "msg_apply_confirm",
              conversationId: "conv_apply",
              role: "USER",
              content: "Confirm",
            }),
            makeMessage({
              id: "msg_apply_done",
              conversationId: "conv_apply",
              role: "ASSISTANT",
              content: "Done! I've submitted your application.",
            }),
          ];
          return Promise.resolve(
            sseResponse(["Done! I've submitted your application."]),
          );
        }

        if (json.content === "Cancel") {
          currentConversation = makeConversation({
            id: "conv_apply",
            title: "Gig help",
            pendingAction: null,
          });
          currentMessages = [
            currentMessages[0]!,
            makeMessage({
              id: "msg_apply_cancel",
              conversationId: "conv_apply",
              role: "USER",
              content: "Cancel",
            }),
            makeMessage({
              id: "msg_apply_skipped",
              conversationId: "conv_apply",
              role: "ASSISTANT",
              content: "No problem, I won't apply.",
            }),
          ];
          return Promise.resolve(sseResponse(["No problem, I won't apply."]));
        }

        return Promise.reject(new Error(`Unexpected message: ${json.content}`));
      },
    );

    const applyRoute = await renderAiRoute({ conversationId: "conv_apply" });

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Apply to Calculus Tutor")).toBeInTheDocument();
    expect(
      screen.getByText("I can tutor evenings after 5 PM."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(state.messagesPost).toHaveBeenCalledWith({
        param: { id: "conv_apply" },
        json: { content: "Confirm" },
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText("Done! I've submitted your application."),
    ).toBeInTheDocument();

    applyRoute.unmount();
    state.messagesPost.mockClear();

    currentConversation = makeConversation({
      id: "conv_save",
      title: "Music ideas",
      pendingAction: {
        id: "pending_save_1",
        toolName: "saveEvent",
        summary: "Save Jazz Night",
        args: {
          eventId: "evt_jazz_night",
          collectionId: null,
        },
      },
    });
    currentMessages = [
      makeMessage({
        id: "msg_save_prompt",
        conversationId: "conv_save",
        role: "ASSISTANT",
        content: "Want me to save Jazz Night for later?",
      }),
    ];
    state.messagesPost.mockImplementation(
      ({ json }: { json: { content: string } }) => {
        if (json.content === "Cancel") {
          currentConversation = makeConversation({
            id: "conv_save",
            title: "Music ideas",
            pendingAction: null,
          });
          currentMessages = [
            currentMessages[0]!,
            makeMessage({
              id: "msg_save_cancel",
              conversationId: "conv_save",
              role: "USER",
              content: "Cancel",
            }),
            makeMessage({
              id: "msg_save_skipped",
              conversationId: "conv_save",
              role: "ASSISTANT",
              content: "No problem, I won't save it.",
            }),
          ];
          return Promise.resolve(sseResponse(["No problem, I won't save it."]));
        }

        return Promise.reject(new Error(`Unexpected message: ${json.content}`));
      },
    );

    const saveRoute = await renderAiRoute({ conversationId: "conv_save" });

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Save Jazz Night")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(state.messagesPost).toHaveBeenCalledWith({
        param: { id: "conv_save" },
        json: { content: "Cancel" },
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("No problem, I won't save it.")).toBeInTheDocument();

    saveRoute.unmount();

    currentConversation = makeConversation({
      id: "conv_create",
      title: "Plan a gig",
      pendingAction: {
        id: "pending_create_1",
        toolName: "createEvent",
        summary: 'Create gig "Campus Jam Session"',
        args: {
          title: "Campus Jam Session",
          description: "Open rehearsal for student musicians.",
          type: "GIG",
          location: {
            name: "Ohio Union Performance Hall",
            latitude: null,
            longitude: null,
          },
          startAt: "2026-04-05T18:30:00.000Z",
          endAt: "2026-04-05T20:00:00.000Z",
          compensation: {
            amount: 25,
            currency: "USD",
            type: "HOURLY",
          },
          imageUrl: null,
        },
      },
    });
    currentMessages = [
      makeMessage({
        id: "msg_create_prompt",
        conversationId: "conv_create",
        role: "ASSISTANT",
        content: "I have the event details ready. Want me to create it?",
      }),
    ];

    await renderAiRoute({ conversationId: "conv_create" });

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText('Create gig "Campus Jam Session"')).toBeInTheDocument();
    expect(screen.getByText("Ohio Union Performance Hall")).toBeInTheDocument();
    expect(screen.getByText("$25/hr")).toBeInTheDocument();
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

  it("TC-CHAT-014: renders suggested replies and sends the clicked suggestion", async () => {
    const user = userEvent.setup();

    state.conversationsGet.mockResolvedValue(
      jsonResponse(
        paginated([
          makeConversation({
            id: "conv_suggestions",
            title: "Music plans",
          }),
        ]),
      ),
    );
    state.messagesGet.mockResolvedValue(
      jsonResponse(
        paginated([
          makeMessage({
            id: "msg_suggestions",
            conversationId: "conv_suggestions",
            role: "ASSISTANT",
            content: "Want to narrow this down?",
            parts: [
              {
                type: "reply-suggestions",
                toolName: "suggestReplies",
                suggestions: [
                  "Show me music events tonight",
                  "Only free music events",
                  "What about this weekend?",
                ],
              },
            ],
          }),
        ]),
      ),
    );
    state.messagesPost.mockResolvedValue(
      sseResponse(["Here are the free music events tonight."]),
    );

    await renderAiRoute({ conversationId: "conv_suggestions" });

    expect(
      await screen.findByRole("button", { name: "Show me music events tonight" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Only free music events" }),
    );

    await waitFor(() => {
      expect(state.messagesPost).toHaveBeenCalledWith({
        param: { id: "conv_suggestions" },
        json: { content: "Only free music events" },
      });
    });
  });
});
