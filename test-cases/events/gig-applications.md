# Gig Applications Test Cases

Spec: [`gig-applications`](../../specs/events/gig-applications.md)

---

## TC-APP-001: Apply to a gig

- **Spec scenario**: S-APP-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User B is authenticated, gig G exists owned by user A
- **When**: User B sends `POST /gigs/G/applications` with `{ message: "I'm interested" }`
- **Then**: An Application is created with status PENDING and an APPLY interaction is recorded

## TC-APP-002: Cannot apply to own gig

- **Spec scenario**: S-APP-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A created gig G
- **When**: User A sends `POST /gigs/G/applications`
- **Then**: The API responds with 403 Forbidden

## TC-APP-003: Cannot apply twice

- **Spec scenario**: S-APP-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User B already applied to gig G
- **When**: User B sends `POST /gigs/G/applications` again
- **Then**: The API responds with 409 Conflict

## TC-APP-004: Accept an application

- **Spec scenario**: S-APP-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Gig G has a PENDING application from user B
- **When**: The gig owner sends `PATCH /gigs/G/applications/app1` with `{ status: "ACCEPTED" }`
- **Then**: The application status is ACCEPTED

## TC-APP-005: Reject an application

- **Spec scenario**: S-APP-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Gig G has a PENDING application from user B
- **When**: The gig owner sends `PATCH /gigs/G/applications/app1` with `{ status: "REJECTED" }`
- **Then**: The application status is REJECTED

## TC-APP-006: Accept multiple applicants

- **Spec scenario**: S-APP-6
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Gig G has PENDING applications from users B, C, and D
- **When**: The gig owner accepts users B and C
- **Then**: B is ACCEPTED, C is ACCEPTED, D is still PENDING, gig status is still OPEN

## TC-APP-007: Cannot apply to non-gig event

- **Spec scenario**: S-APP-7
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Event E has type EVENT (not GIG)
- **When**: User B sends `POST /gigs/E/applications`
- **Then**: The API responds with 400 Bad Request

## TC-APP-008: Cannot apply to cancelled gig

- **Spec scenario**: S-APP-8
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Gig G has status CANCELLED
- **When**: User B sends `POST /gigs/G/applications`
- **Then**: The API responds with 400 Bad Request

## TC-APP-009: Cannot change status of non-PENDING application

- **Spec scenario**: S-APP-9
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User B's application to gig G has status ACCEPTED
- **When**: The gig owner sends `PATCH` with `{ status: "REJECTED" }`
- **Then**: The API responds with 400 Bad Request; application status remains ACCEPTED

## TC-APP-010: Apply button on gig detail page — UI

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_app/events/$eventId/-applications.test.tsx`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: The authenticated viewer does not own the gig
- **When**: They open the apply dialog from the gig detail page and submit an application
- **Then**: The request is posted and the UI shows confirmation or returned validation details

## TC-APP-011: "My Applications" view — UI

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_app/you/applications/-index.test.tsx`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: The authenticated user has submitted gig applications
- **When**: They open `You -> Applications`
- **Then**: The page lists their applications with current statuses and links back to each gig

## TC-APP-012: "Manage Applications" view — UI

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_app/events/$eventId/applications/-index.test.tsx`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: The authenticated user owns a gig with pending applications
- **When**: They open the manage-applications view and accept or reject an applicant
- **Then**: Applicant details render and status updates are reflected immediately

## TC-APP-013: Application succeeds when APPLY interaction recording fails

- **Spec scenario**: S-APP-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`, `apps/backend/src/test/runtime/runtime.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User B is authenticated, gig G exists owned by user A, and interaction persistence fails
- **When**: User B sends `POST /gigs/G/applications` with `{ message: "I'm interested" }`
- **Then**: The API still responds with 201 Created and the application is created with status PENDING

## TC-APP-014: Current user can list their applications across gigs

- **Spec scenario**: S-APP-10
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-applications.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: The authenticated user has applied to multiple gigs
- **When**: The client sends `GET /users/me/applications`
- **Then**: The API returns the user's applications with gig summaries, ordered newest first

## TC-APP-015: API rejects applications to a non-open gig

- **Spec scenario**: S-APP-11
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: Gig G has status IN_PROGRESS or COMPLETED
- **When**: A non-owner sends `POST /gigs/G/applications`
- **Then**: The API responds with 400 Bad Request

## TC-APP-016: Gig detail hides apply action for non-open gigs

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_app/events/$eventId/-applications.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: Gig G has status IN_PROGRESS or COMPLETED
- **When**: A non-owner opens the gig detail page
- **Then**: The apply action is not shown

## TC-APP-017: My Applications page renders a loading skeleton

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_app/you/applications/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The current user's applications request is still loading
- **When**: The user opens `You -> Applications`
- **Then**: The page renders a subpage-shaped skeleton instead of a blank surface

## TC-APP-018: Manage Applications renders a loading skeleton

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_app/events/$eventId/applications/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The gig owner opens the manage-applications page and the applications request is still loading
- **When**: The page renders
- **Then**: The applications list area renders loading skeleton cards
