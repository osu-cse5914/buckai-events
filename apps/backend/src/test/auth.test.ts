import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { Prisma } from "@prisma/client";

const mockClerkGetUser = vi.fn();

vi.mock("@hono/clerk-auth", () => ({
  clerkMiddleware: () =>
    async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
      c.set("clerk", { users: { getUser: mockClerkGetUser } });
      await next();
    },
  getAuth: vi.fn(),
}));

vi.mock("../lib/prisma");

import { getAuth } from "@hono/clerk-auth";
import { getPrisma, getPrismaClient } from "../lib/prisma";
import { createMockPrisma } from "./helpers/prisma";
import { E2E_TEST_AUTH_HEADER, e2eTestAuth } from "../middleware/e2e-auth";
import { requireAuth } from "../middleware/auth";

type TestEnv = {
  Variables: { user: { id: string; clerkId: string; email: string; role: string } };
};

function createTestApp() {
  const app = new Hono<TestEnv>();
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("clerk", { users: { getUser: mockClerkGetUser } });
    await next();
  });
  app.use("/*", requireAuth);
  app.get("/test", (c) => c.json({ user: c.get("user") }));
  return app;
}

function createE2ETestApp() {
  const app = new Hono<TestEnv>();
  app.use("/*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set("clerk", { users: { getUser: mockClerkGetUser } });
    await next();
  });
  app.use("/*", e2eTestAuth);
  app.use("/*", requireAuth);
  app.get("/test", (c) => c.json({ user: c.get("user") }));
  return app;
}

describe("[phase:0] [regression:always] requireAuth middleware", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  // S-AUTH-5 → TC-AUTH-005: Missing or invalid JWT returns 401
  describe("missing or invalid JWT", () => {
    it("TC-AUTH-005: returns 401 when userId is null", async () => {
      vi.mocked(getAuth).mockReturnValue({ userId: null } as never);

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(401);
      expect(res.headers.get("content-type")).toContain("application/problem+json");
      expect(await res.json()).toMatchObject({
        type: expect.stringContaining("unauthorized"),
        title: "Unauthorized",
        status: 401,
        detail: "Authentication is required",
      });
    });

    it("TC-AUTH-005: returns 401 when auth is undefined", async () => {
      vi.mocked(getAuth).mockReturnValue(undefined as never);

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(401);
      expect(res.headers.get("content-type")).toContain("application/problem+json");
      expect(await res.json()).toMatchObject({
        type: expect.stringContaining("unauthorized"),
        title: "Unauthorized",
        status: 401,
        detail: "Authentication is required",
      });
    });

  });

  // S-AUTH-4 → TC-AUTH-004: Valid JWT on API request
  describe("returning user", () => {
    it("TC-AUTH-004: attaches existing user to context and proceeds", async () => {
      const existingUser = {
        id: "cuid_123",
        clerkId: "clerk_abc123",
        email: "student@osu.edu",
        role: "ADMIN",
      };

      vi.mocked(getAuth).mockReturnValue({ userId: "clerk_abc123" } as never);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(existingUser as never);

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ user: existingUser });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: "clerk_abc123" },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  // S-AUTH-6 → TC-AUTH-006: First-time user provisioning
  describe("first-time user provisioning", () => {
    it("TC-AUTH-006: creates a User row on first authentication", async () => {
      const createdUser = {
        id: "cuid_new",
        clerkId: "clerk_new_user",
        email: "newstudent@osu.edu",
        role: "USER",
      };

      vi.mocked(getAuth).mockReturnValue({ userId: "clerk_new_user" } as never);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
      mockClerkGetUser.mockResolvedValue({
        primaryEmailAddressId: "email_1",
        emailAddresses: [
          { id: "email_1", emailAddress: "newstudent@osu.edu" },
        ],
      });
      vi.mocked(mockPrisma.user.create).mockResolvedValue(createdUser as never);

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(200);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { clerkId: "clerk_new_user", email: "newstudent@osu.edu", role: "USER" },
      });
      expect(await res.json()).toEqual({ user: createdUser });
    });

    it("TC-AUTH-002: uses primary email address from Clerk (BuckeyeMail)", async () => {
      vi.mocked(getAuth).mockReturnValue({ userId: "clerk_multi" } as never);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
      mockClerkGetUser.mockResolvedValue({
        primaryEmailAddressId: "email_2",
        emailAddresses: [
          { id: "email_1", emailAddress: "other@gmail.com" },
          { id: "email_2", emailAddress: "primary@buckeyemail.osu.edu" },
        ],
      });
      vi.mocked(mockPrisma.user.create).mockResolvedValue({
        id: "cuid_multi",
        clerkId: "clerk_multi",
        email: "primary@buckeyemail.osu.edu",
        role: "USER",
      } as never);

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(200);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          clerkId: "clerk_multi",
          email: "primary@buckeyemail.osu.edu",
          role: "USER",
        },
      });
    });

    it("TC-AUTH-009: recovers from concurrent create race (P2002)", async () => {
      const existingUser = {
        id: "cuid_race",
        clerkId: "clerk_racer",
        email: "racer@osu.edu",
        role: "USER",
      };

      vi.mocked(getAuth).mockReturnValue({ userId: "clerk_racer" } as never);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValueOnce(null);
      vi.mocked(mockPrisma.user.findUniqueOrThrow).mockResolvedValue(existingUser as never);
      mockClerkGetUser.mockResolvedValue({
        primaryEmailAddressId: "email_1",
        emailAddresses: [{ id: "email_1", emailAddress: "racer@osu.edu" }],
      });
      vi.mocked(mockPrisma.user.create).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "7.4.0",
        })
      );

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ user: existingUser });
    });

    it("TC-AUTH-001: provisions user with valid @osu.edu email", async () => {
      const createdUser = {
        id: "cuid_osu",
        clerkId: "clerk_osu",
        email: "student@osu.edu",
        role: "USER",
      };

      vi.mocked(getAuth).mockReturnValue({ userId: "clerk_osu" } as never);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
      mockClerkGetUser.mockResolvedValue({
        primaryEmailAddressId: "email_1",
        emailAddresses: [{ id: "email_1", emailAddress: "student@osu.edu" }],
      });
      vi.mocked(mockPrisma.user.create).mockResolvedValue(createdUser as never);

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(200);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { clerkId: "clerk_osu", email: "student@osu.edu", role: "USER" },
      });
    });

    it("TC-AUTH-003: rejects non-OSU email with 403", async () => {
      vi.mocked(getAuth).mockReturnValue({ userId: "clerk_gmail" } as never);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
      mockClerkGetUser.mockResolvedValue({
        primaryEmailAddressId: "email_1",
        emailAddresses: [{ id: "email_1", emailAddress: "student@gmail.com" }],
      });

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(403);
      expect(res.headers.get("content-type")).toContain("application/problem+json");
      expect(await res.json()).toMatchObject({
        type: expect.stringContaining("forbidden"),
        title: "Forbidden",
        status: 403,
        detail:
          "Email domain not allowed. Only @osu.edu and @buckeyemail.osu.edu addresses are permitted.",
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("TC-AUTH-003: rejects non-OSU email even if domain contains osu.edu as substring", async () => {
      vi.mocked(getAuth).mockReturnValue({ userId: "clerk_fake" } as never);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
      mockClerkGetUser.mockResolvedValue({
        primaryEmailAddressId: "email_1",
        emailAddresses: [{ id: "email_1", emailAddress: "user@notosu.edu" }],
      });

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(403);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("TC-AUTH-006: returns 400 when Clerk user has no email", async () => {
      vi.mocked(getAuth).mockReturnValue({ userId: "clerk_no_email" } as never);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
      mockClerkGetUser.mockResolvedValue({
        primaryEmailAddressId: null,
        emailAddresses: [],
      });

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({
        type: expect.stringContaining("invalid-request"),
        title: "Invalid request",
        status: 400,
        detail: "No email associated with account",
      });
    });
  });
});

describe("[phase:6] [regression:always] E2E auth isolation", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
  });

  it("TC-AUTH-012: ignores the E2E auth header when E2E test auth is disabled", async () => {
    vi.mocked(getAuth).mockReturnValue(undefined as never);

    const res = await createE2ETestApp().request("/test", {
      headers: {
        [E2E_TEST_AUTH_HEADER]: "user_e2e_only",
      },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      type: expect.stringContaining("unauthorized"),
      title: "Unauthorized",
      status: 401,
      detail: "Authentication is required",
    });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});
