import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/prisma");

const mockClerkGetUser = vi.fn();

import { getPrisma, getPrismaClient } from "../lib/prisma";
import { ProblemError, notFound, problemFromError } from "../lib/problem-details";
import { buildAuthUser, buildFollow } from "./factories";
import { createMockPrisma } from "./helpers/prisma";
import { users } from "../routes/users";

const USER_A = buildAuthUser({
  id: "user_a",
  clerkId: "clerk_a",
  email: "usera@osu.edu",
});
const USER_B_ID = "user_b";

function createTestApp(user = USER_A) {
  const app = new Hono();
  app.notFound((c) => notFound(c, "Route not found"));
  app.onError((error, c) => {
    if (!(error instanceof ProblemError)) console.error(error);
    return problemFromError(c, error);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use("/*", async (c, next) => {
    (c as any).set("user", user);
    (c as any).set("clerk", { users: { getUser: mockClerkGetUser } });
    await next();
  });
  app.route("/users", users);
  return app;
}

describe("[phase:3] [regression:always] Follow API", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
    vi.mocked(getPrisma).mockReturnValue(mockPrisma);
    mockClerkGetUser.mockResolvedValue({ imageUrl: "https://example.com/avatar.png" });
    // Default $transaction: execute all ops
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      (ops: Promise<unknown>[]) => Promise.all(ops),
    );
  });

  // TC-FOL-001
  it("TC-FOL-001: POST /:id/follow creates follow and returns 201", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: USER_B_ID } as never);
    vi.mocked(mockPrisma.follow.findUnique).mockResolvedValue(null);
    vi.mocked(mockPrisma.follow.create).mockResolvedValue({
      followerId: USER_A.id,
      followeeId: USER_B_ID,
      createdAt: new Date(),
    } as never);
    vi.mocked(mockPrisma.user.update).mockResolvedValue({} as never);

    const res = await createTestApp().request(`/users/${USER_B_ID}/follow`, {
      method: "POST",
    });

    expect(res.status).toBe(201);
    expect(mockPrisma.follow.findUnique).toHaveBeenCalledWith({
      where: {
        followerId_followeeId: { followerId: USER_A.id, followeeId: USER_B_ID },
      },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.follow.create).toHaveBeenCalledWith({
      data: { followerId: USER_A.id, followeeId: USER_B_ID },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_B_ID },
      data: { followerCount: { increment: 1 } },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_A.id },
      data: { followingCount: { increment: 1 } },
    });
  });

  // TC-FOL-002
  it("TC-FOL-002: POST /:id/follow returns 400 when following yourself", async () => {
    const res = await createTestApp().request(`/users/${USER_A.id}/follow`, {
      method: "POST",
    });

    expect(res.status).toBe(400);
    expect(mockPrisma.follow.findUnique).not.toHaveBeenCalled();
  });

  // TC-FOL-003
  it("TC-FOL-003: POST /:id/follow returns 409 when already following", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: USER_B_ID } as never);
    vi.mocked(mockPrisma.follow.findUnique).mockResolvedValue({
      ...buildFollow(),
      followerId: USER_A.id,
      followeeId: USER_B_ID,
    } as never);

    const res = await createTestApp().request(`/users/${USER_B_ID}/follow`, {
      method: "POST",
    });

    expect(res.status).toBe(409);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  // TC-FOL-004
  it("TC-FOL-004: DELETE /:id/follow removes follow and returns 204", async () => {
    vi.mocked(mockPrisma.follow.findUnique).mockResolvedValue({
      ...buildFollow(),
      followerId: USER_A.id,
      followeeId: USER_B_ID,
    } as never);
    vi.mocked(mockPrisma.follow.delete).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.user.update).mockResolvedValue({} as never);

    const res = await createTestApp().request(`/users/${USER_B_ID}/follow`, {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
    expect(mockPrisma.follow.findUnique).toHaveBeenCalledWith({
      where: {
        followerId_followeeId: { followerId: USER_A.id, followeeId: USER_B_ID },
      },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.follow.delete).toHaveBeenCalledWith({
      where: {
        followerId_followeeId: { followerId: USER_A.id, followeeId: USER_B_ID },
      },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_B_ID },
      data: { followerCount: { decrement: 1 } },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_A.id },
      data: { followingCount: { decrement: 1 } },
    });
  });

  // TC-FOL-005
  it("TC-FOL-005: DELETE /:id/follow returns 404 when not following", async () => {
    vi.mocked(mockPrisma.follow.findUnique).mockResolvedValue(null);

    const res = await createTestApp().request(`/users/${USER_B_ID}/follow`, {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  // TC-FOL-006
  it("TC-FOL-006: GET /:id/followers returns paginated follower profiles", async () => {
    const followerProfiles = [
      { id: "user_c", clerkId: "clerk_c", displayName: "User C", major: "CS", gradYear: 2026 },
      { id: "user_d", clerkId: "clerk_d", displayName: "User D", major: "Math", gradYear: 2025 },
      { id: "user_e", clerkId: "clerk_e", displayName: "User E", major: "ECE", gradYear: 2027 },
    ];
    vi.mocked(mockPrisma.follow.findMany).mockResolvedValue(
      followerProfiles.map((p) => ({ follower: p })) as never,
    );
    vi.mocked(mockPrisma.follow.count).mockResolvedValue(3);

    const res = await createTestApp().request(`/users/${USER_B_ID}/followers`);

    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[]; pagination: { total: number } };
    expect(body.data).toHaveLength(3);
    expect(body.pagination.total).toBe(3);
    expect(body.data[0]).toMatchObject({
      id: "user_c",
      displayName: "User C",
      imageUrl: "https://example.com/avatar.png",
    });
    expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { followeeId: USER_B_ID } }),
    );
  });

  // TC-FOL-007
  it("TC-FOL-007: GET /:id/following returns paginated following profiles", async () => {
    const followingProfiles = Array.from({ length: 5 }, (_, i) => ({
      id: `user_${i}`,
      clerkId: `clerk_${i}`,
      displayName: `User ${i}`,
      major: "CS",
      gradYear: 2026,
    }));
    vi.mocked(mockPrisma.follow.findMany).mockResolvedValue(
      followingProfiles.map((p) => ({ followee: p })) as never,
    );
    vi.mocked(mockPrisma.follow.count).mockResolvedValue(5);

    const res = await createTestApp().request(`/users/${USER_A.id}/following`);

    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[]; pagination: { total: number } };
    expect(body.data).toHaveLength(5);
    expect(body.pagination.total).toBe(5);
    expect(body.data[0]).toMatchObject({ imageUrl: "https://example.com/avatar.png" });
    expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { followerId: USER_A.id } }),
    );
  });
});
