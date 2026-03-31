import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClerkGetUser = vi.fn();

vi.mock("@hono/clerk-auth", () => ({
  clerkMiddleware: () =>
    async (
      c: { set: (key: string, value: unknown) => void },
      next: () => Promise<void>
    ) => {
      c.set("clerk", { users: { getUser: mockClerkGetUser } });
      await next();
    },
  getAuth: vi.fn(),
}));

vi.mock("../lib/prisma");

import { getAuth } from "@hono/clerk-auth";
import { getPrismaClient, getPrisma } from "../lib/prisma";
import { createMockPrisma } from "./helpers/prisma";
import { app } from "../index";
import { makeAuthRequest } from "./helpers/context";

const FULL_USER = {
  id: "user_1",
  clerkId: "clerk_abc123",
  email: "student@osu.edu",
  role: "USER",
  displayName: "Brutus",
  major: "CS",
  gradYear: 2025,
  interests: ["sports", "music"],
  followerCount: 10,
  followingCount: 5,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-02T00:00:00Z"),
};

describe("[phase:1] [regression:always] GET /api/v1/users/me", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: FULL_USER.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(FULL_USER as never);
  });

  it("TC-USER-001: returns the authenticated user's full profile", async () => {
    const res = await app.request(makeAuthRequest("/api/v1/users/me"));

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toMatchObject({
      id: FULL_USER.id,
      email: FULL_USER.email,
      displayName: FULL_USER.displayName,
      major: FULL_USER.major,
      gradYear: FULL_USER.gradYear,
      interests: FULL_USER.interests,
    });
    expect(data).toHaveProperty("createdAt");
    expect(data).toHaveProperty("updatedAt");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuth).mockReturnValue({ userId: null } as never);

    const res = await app.request(makeAuthRequest("/api/v1/users/me"));

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("unauthorized"),
      title: "Unauthorized",
      status: 401,
      detail: "Authentication is required",
    });
  });

  it("returns 404 when user no longer exists in database", async () => {
    // Auth middleware finds user, but a second lookup by id returns null
    vi.mocked(mockPrisma.user.findUnique)
      .mockResolvedValueOnce(FULL_USER as never) // auth middleware
      .mockResolvedValueOnce(null);              // route handler

    const res = await app.request(makeAuthRequest("/api/v1/users/me"));

    expect(res.status).toBe(404);
  });
});

describe("[phase:1] [regression:always] PATCH /api/v1/users/me", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: FULL_USER.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(FULL_USER as never);
  });

  it("TC-USER-002: updates displayName and refreshes updatedAt", async () => {
    const updatedUser = {
      ...FULL_USER,
      displayName: "New Brutus",
      updatedAt: new Date("2025-06-01T00:00:00Z"),
    };
    vi.mocked(mockPrisma.user.update).mockResolvedValue(updatedUser as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: "New Brutus" }),
      })
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.displayName).toBe("New Brutus");
    expect(data).toHaveProperty("updatedAt");
  });

  it("TC-USER-003: updates interests", async () => {
    const newInterests = ["music", "sports", "tech"];
    const updatedUser = { ...FULL_USER, interests: newInterests };
    vi.mocked(mockPrisma.user.update).mockResolvedValue(updatedUser as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ interests: newInterests }),
      })
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.interests).toEqual(newInterests);
  });

  it("TC-USER-004: partial update preserves other fields", async () => {
    const updatedUser = { ...FULL_USER, major: "ECE" };
    vi.mocked(mockPrisma.user.update).mockResolvedValue(updatedUser as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ major: "ECE" }),
      })
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.major).toBe("ECE");
    expect(data.displayName).toBe(FULL_USER.displayName);
    // Verify only major was sent to prisma update
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FULL_USER.id },
        data: expect.objectContaining({ major: "ECE" }),
      })
    );
    const updateCall = vi.mocked(mockPrisma.user.update).mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.data).not.toHaveProperty("displayName");
  });

  it("TC-USER-005: email field is silently ignored", async () => {
    vi.mocked(mockPrisma.user.update).mockResolvedValue(FULL_USER as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ email: "new@osu.edu" }),
      })
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.email).toBe(FULL_USER.email);
    // Verify email was NOT passed to prisma update
    if (vi.mocked(mockPrisma.user.update).mock.calls.length > 0) {
      const updateCall = vi.mocked(mockPrisma.user.update).mock.calls[0][0] as Record<string, unknown>;
      expect(updateCall.data).not.toHaveProperty("email");
    }
  });

  it("strips immutable fields (id, clerkId) when mixed with valid fields", async () => {
    const updatedUser = { ...FULL_USER, displayName: "Updated" };
    vi.mocked(mockPrisma.user.update).mockResolvedValue(updatedUser as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "Updated",
          id: "hacked_id",
          clerkId: "hacked_clerk",
          email: "hacked@osu.edu",
          role: "ADMIN",
        }),
      })
    );

    expect(res.status).toBe(200);
    const updateCall = vi.mocked(mockPrisma.user.update).mock.calls[0][0] as Record<string, unknown>;
    const updateData = updateCall.data as Record<string, unknown>;
    expect(updateData).toEqual({ displayName: "Updated" });
    expect(updateData).not.toHaveProperty("id");
    expect(updateData).not.toHaveProperty("clerkId");
    expect(updateData).not.toHaveProperty("email");
    expect(updateData).not.toHaveProperty("role");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuth).mockReturnValue({ userId: null } as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: "X" }),
      })
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("unauthorized"),
      title: "Unauthorized",
      status: 401,
      detail: "Authentication is required",
    });
  });

  it("TC-USER-008: returns 400 for null JSON payload", async () => {
    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify(null),
      })
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toMatchObject({
      type: expect.stringContaining("invalid-body"),
      title: "Invalid request body",
      status: 400,
    });
  });

  it("TC-USER-008: returns 400 for numeric JSON payload", async () => {
    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify(42),
      })
    );

    expect(res.status).toBe(400);
  });

  it("TC-USER-008: returns 400 for string JSON payload", async () => {
    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify("hello"),
      })
    );

    expect(res.status).toBe(400);
  });

  it("TC-USER-008: returns 400 for array JSON payload", async () => {
    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify([1, 2, 3]),
      })
    );

    expect(res.status).toBe(400);
  });
});

describe("[phase:6] [regression:always] GET /api/v1/users/me role contract", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: FULL_USER.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(FULL_USER as never);
  });

  it("TC-USER-009: includes the authenticated user's persisted role", async () => {
    const res = await app.request(makeAuthRequest("/api/v1/users/me"));

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.role).toBe("USER");
  });
});

describe("[phase:6] [regression:always] PATCH /api/v1/users/me immutable role", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getAuth).mockReturnValue({ userId: FULL_USER.clerkId } as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(FULL_USER as never);
  });

  it("TC-USER-010: role field is silently ignored", async () => {
    vi.mocked(mockPrisma.user.update).mockResolvedValue(FULL_USER as never);

    const res = await app.request(
      makeAuthRequest("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ role: "ADMIN" }),
      })
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.role).toBe("USER");
    if (vi.mocked(mockPrisma.user.update).mock.calls.length > 0) {
      const updateCall = vi.mocked(mockPrisma.user.update).mock.calls[0][0] as Record<string, unknown>;
      expect(updateCall.data).not.toHaveProperty("role");
    }
  });
});
