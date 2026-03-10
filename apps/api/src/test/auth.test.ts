import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

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
import { getPrismaClient } from "../lib/prisma";
import { createMockPrisma } from "./helpers/prisma";
import { requireAuth } from "../middleware/auth";

function createTestApp() {
  const app = new Hono();
  app.use("/*", async (c, next) => {
    c.set("clerk", { users: { getUser: mockClerkGetUser } } as never);
    await next();
  });
  app.use("/*", requireAuth);
  app.get("/test", (c) => c.json({ user: c.get("user") }));
  return app;
}

describe("requireAuth middleware", () => {
  const mockPrisma = createMockPrisma();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
  });

  // S-AUTH-5: Missing or invalid JWT
  describe("missing or invalid JWT", () => {
    it("returns 401 when userId is null", async () => {
      vi.mocked(getAuth).mockReturnValue({ userId: null } as never);

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 401 when auth is undefined", async () => {
      vi.mocked(getAuth).mockReturnValue(undefined as never);

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });
  });

  // S-AUTH-4: Valid JWT — returning user
  describe("returning user", () => {
    it("attaches existing user to context and proceeds", async () => {
      const existingUser = {
        id: "cuid_123",
        clerkId: "clerk_abc123",
        email: "student@osu.edu",
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

  // S-AUTH-6: First-time user provisioning
  describe("first-time user provisioning", () => {
    it("creates a User row on first authentication", async () => {
      const createdUser = {
        id: "cuid_new",
        clerkId: "clerk_new_user",
        email: "newstudent@osu.edu",
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
        data: { clerkId: "clerk_new_user", email: "newstudent@osu.edu" },
      });
      expect(await res.json()).toEqual({ user: createdUser });
    });

    it("uses primary email address from Clerk", async () => {
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
      } as never);

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(200);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { clerkId: "clerk_multi", email: "primary@buckeyemail.osu.edu" },
      });
    });

    it("returns 400 when Clerk user has no email", async () => {
      vi.mocked(getAuth).mockReturnValue({ userId: "clerk_no_email" } as never);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
      mockClerkGetUser.mockResolvedValue({
        primaryEmailAddressId: null,
        emailAddresses: [],
      });

      const res = await createTestApp().request("/test");

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "No email associated with account" });
    });
  });
});
