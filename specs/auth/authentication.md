# Authentication

## Overview

Authentication is handled by Clerk, restricted to Ohio State University email domains. The backend verifies Clerk-issued JWTs on every API request.

## Behaviors

### Email Domain Restriction

Only users with `@osu.edu` or `@buckeyemail.osu.edu` email addresses can create accounts. Clerk is configured to enforce this at the identity provider level.

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
