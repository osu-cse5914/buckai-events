# Authentication

## Overview

Authentication is handled by Clerk, restricted to The Ohio State University email domains. The backend verifies Clerk-issued JWTs on every API request.

## Behaviors

### Email Domain Restriction

Only users with `@osu.edu` or `@buckeyemail.osu.edu` email addresses can create accounts. This is enforced at two layers:

1. **Clerk (client-side)**: Clerk is configured with an allowlist of permitted email domains, rejecting non-OSU sign-ups at the identity provider level.
2. **API middleware (server-side)**: The `requireAuth` middleware validates the email domain from the Clerk JWT as defense-in-depth. Requests with non-OSU emails receive a 403 Forbidden response.

### JWT Verification

Every API request includes a Clerk JWT in the `Authorization: Bearer <token>` header. The `@hono/clerk-auth` middleware validates the token and populates the request context with the authenticated user's Clerk ID.

### User Provisioning

When a user authenticates for the first time, the system creates a `User` record linked to their Clerk ID. Subsequent requests resolve the `User` record via `clerkId`.

## Scenarios

### S-AUTH-1: Valid OSU email sign-up

```
GIVEN a user with email "student@osu.edu"
WHEN they complete Clerk sign-up
THEN the system creates a User record with that email and their clerkId
```

### S-AUTH-2: Valid BuckeyeMail sign-up

```
GIVEN a user with email "student@buckeyemail.osu.edu"
WHEN they complete Clerk sign-up
THEN the system creates a User record with that email and their clerkId
```

### S-AUTH-3: Non-OSU email rejected

```
GIVEN a user with email "student@gmail.com"
WHEN they attempt Clerk sign-up
THEN Clerk rejects the sign-up
AND no User record is created
```

### S-AUTH-3b: Non-OSU email rejected at API layer (defense-in-depth)

```
GIVEN a valid JWT for a user whose primary email is "student@gmail.com"
AND no User record exists with that clerkId
WHEN the user makes an API request
THEN the API responds with 403 Forbidden
AND no User record is created
```

### S-AUTH-4: Valid JWT on API request

```
GIVEN a request with a valid Clerk JWT for user "clerk_abc123"
WHEN the request reaches any /api/* endpoint
THEN the middleware extracts clerkId "clerk_abc123"
AND the request proceeds with the authenticated user context
```

### S-AUTH-5: Missing or invalid JWT

```
GIVEN a request with no Authorization header OR an invalid JWT
WHEN the request reaches any /api/* endpoint
THEN the API responds with 401 Unauthorized
```

### S-AUTH-6: First-time user provisioning

```
GIVEN a valid JWT for clerkId "clerk_new_user"
AND no User record exists with that clerkId
WHEN the user makes their first API request
THEN the system creates a User record with clerkId "clerk_new_user" and the email from the JWT
AND the request proceeds normally
```

## Configuration

### Clerk Dashboard — Email Domain Allowlist

The Clerk instance is configured to restrict sign-ups to OSU email domains. To set this up or verify the configuration:

1. Open the [Clerk Dashboard](https://dashboard.clerk.com/) and select the project.
2. Navigate to **User & Authentication → Restrictions**.
3. Under **Sign-up restrictions**, enable **Allowlist**.
4. Add the following domains to the allowlist:
   - `osu.edu`
   - `buckeyemail.osu.edu`
5. Ensure **Block sign-ups from email addresses not on the allowlist** is enabled.
6. Save changes.

This prevents non-OSU users from creating accounts at the Clerk identity layer. The API middleware provides an additional server-side check as defense-in-depth (see S-AUTH-3b).

## Test Cases

See [`test-cases/auth/authentication.md`](../../test-cases/auth/authentication.md) for the full test case registry (TC-AUTH-001 through TC-AUTH-010), including automated API tests, E2E tests, and manual UI verification cases.
