# Authentication Test Cases

Spec: [`authentication`](../../specs/auth/authentication.md)

---

## TC-AUTH-001: Valid OSU email sign-up

- **Spec scenario**: S-AUTH-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/auth.test.ts`
- **Phase introduced**: 0
- **Regression**: Always
- **Given**: A user with email `student@osu.edu`
- **When**: They complete Clerk sign-up
- **Then**: The system creates a User record with that email and their clerkId

## TC-AUTH-002: Valid BuckeyeMail sign-up

- **Spec scenario**: S-AUTH-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/auth.test.ts`
- **Phase introduced**: 0
- **Regression**: Always
- **Given**: A user with email `student@buckeyemail.osu.edu`
- **When**: They complete Clerk sign-up
- **Then**: The system creates a User record with that email and their clerkId

## TC-AUTH-003: Non-OSU email rejected

- **Spec scenario**: S-AUTH-3, S-AUTH-3b
- **Type**: Automated + Manual
- **Automated in**: `apps/backend/src/test/auth.test.ts`
- **Phase introduced**: 0
- **Regression**: Always
- **Given**: A valid JWT for a user whose primary email is a non-OSU domain (e.g. `user@gmail.com`)
- **When**: The user makes an API request (server-side) or attempts Clerk sign-up (client-side)
- **Then**: The API responds with 403 Forbidden; no User record is created
- **Manual steps** (client-side):
  1. Open the app sign-up page
  2. Enter an email with a non-OSU domain (e.g. `user@gmail.com`)
  3. Attempt to complete sign-up
- **Expected (manual)**: Clerk rejects the sign-up; no User record is created in the database

## TC-AUTH-004: Valid JWT on API request

- **Spec scenario**: S-AUTH-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/auth.test.ts`
- **Phase introduced**: 0
- **Regression**: Always
- **Given**: A request with a valid Clerk JWT for user `clerk_abc123`
- **When**: The request reaches any `/api/*` endpoint
- **Then**: The middleware extracts the clerkId and the request proceeds with authenticated user context

## TC-AUTH-005: Missing or invalid JWT returns 401

- **Spec scenario**: S-AUTH-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/auth.test.ts`
- **Phase introduced**: 0
- **Regression**: Always
- **Given**: A request with no Authorization header OR an invalid JWT
- **When**: The request reaches any `/api/*` endpoint
- **Then**: The API responds with 401 Unauthorized

## TC-AUTH-006: First-time user provisioning

- **Spec scenario**: S-AUTH-6
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/auth.test.ts`
- **Phase introduced**: 0
- **Regression**: Always
- **Given**: A valid JWT for clerkId `clerk_new_user` and no User record exists
- **When**: The user makes their first API request
- **Then**: The system creates a User record with the clerkId and email from the JWT, and the request proceeds normally

## TC-AUTH-007: Clerk sign-in UI renders on desktop

- **Spec scenario**: —
- **Type**: Semi-automated
- **Automated in**: `apps/web/src/routes/-auth-pages.test.tsx`
- **Phase introduced**: 0
- **Regression**: Always
- **Steps**:
  1. Open the app at `/sign-in` on a desktop viewport (1280px+)
  2. Verify the Clerk sign-in form is visible and styled consistently with the app
  3. Enter valid OSU credentials and sign in
- **Expected**: Sign-in completes, user is redirected to the app

## TC-AUTH-008: Clerk sign-in UI renders on mobile

- **Spec scenario**: —
- **Type**: Semi-automated
- **Automated in**: `apps/web/src/routes/-auth-pages.test.tsx`
- **Phase introduced**: 0
- **Regression**: Always
- **Steps**:
  1. Open the app at `/sign-in` on a mobile viewport (375px)
  2. Verify the Clerk sign-in form is fully visible without horizontal scroll
  3. Enter valid OSU credentials and sign in
- **Expected**: Sign-in completes, user is redirected to the app

## TC-AUTH-009: Concurrent provisioning race condition

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/auth.test.ts`
- **Phase introduced**: 0
- **Regression**: Always
- **Given**: Two simultaneous first-time requests for the same clerkId
- **When**: Both requests attempt to create a User record
- **Then**: One succeeds, the other recovers via P2002 unique constraint error and fetches the existing user

## TC-AUTH-010: Clerk sign-up UI renders

- **Spec scenario**: S-AUTH-1, S-AUTH-2
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/-auth-pages.test.tsx`
- **Phase introduced**: 0
- **Regression**: Always
- **Given**: An unauthenticated user
- **When**: They navigate to `/sign-up`
- **Then**: The Clerk sign-up widget is visible (no 404)

## TC-AUTH-011: Shared authenticated shell redirects signed-out visitors

- **Spec scenario**: S-AUTH-7
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/-app-pages.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A visitor is not signed in
- **When**: They navigate into the authenticated client route tree
- **Then**: The shared shell guard redirects them to `/sign-in`
- **And**: Child routes do not need to redefine their own auth redirect
