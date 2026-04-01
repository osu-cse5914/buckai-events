/**
 * Test helpers for auth context.
 *
 * Forward-looking: these will be used once JWT middleware (issue #18) is
 * added. When that lands, update makeAuthRequest() to use a real test JWT
 * if needed, or mock the middleware to inject TEST_USER directly.
 */

export const TEST_USER = {
  userId: "user_test_abc123",
  email: "testuser@osu.edu",
};

/**
 * Creates a Request with a fake Authorization header.
 * Use with app.request() to simulate authenticated calls:
 *
 *   const res = await app.request(makeAuthRequest("/api/v1/users/me"));
 */
export function makeAuthRequest(
  path: string,
  init?: RequestInit
): Request {
  const method = (init?.method ?? "GET").toUpperCase();
  const hasBody = ["POST", "PUT", "PATCH"].includes(method);

  return new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      Authorization: "Bearer test-token",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}
