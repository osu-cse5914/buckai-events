# Gig Applications Test Cases

Spec: [`gig-applications`](../../specs/events/gig-applications.md)

---

## TC-APP-001: Apply to a gig

- **Spec scenario**: S-APP-1
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User B is authenticated, gig G exists owned by user A
- **When**: User B sends `POST /gigs/G/applications` with `{ message: "I'm interested" }`
- **Then**: An Application is created with status PENDING and an APPLY interaction is recorded

## TC-APP-002: Cannot apply to own gig

- **Spec scenario**: S-APP-2
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A created gig G
- **When**: User A sends `POST /gigs/G/applications`
- **Then**: The API responds with 403 Forbidden

## TC-APP-003: Cannot apply twice

- **Spec scenario**: S-APP-3
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User B already applied to gig G
- **When**: User B sends `POST /gigs/G/applications` again
- **Then**: The API responds with 409 Conflict

## TC-APP-004: Accept an application

- **Spec scenario**: S-APP-4
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Gig G has a PENDING application from user B
- **When**: The gig owner sends `PATCH /gigs/G/applications/app1` with `{ status: "ACCEPTED" }`
- **Then**: The application status is ACCEPTED

## TC-APP-005: Reject an application

- **Spec scenario**: S-APP-5
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Gig G has a PENDING application from user B
- **When**: The gig owner sends `PATCH /gigs/G/applications/app1` with `{ status: "REJECTED" }`
- **Then**: The application status is REJECTED

## TC-APP-006: Accept multiple applicants

- **Spec scenario**: S-APP-6
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Gig G has PENDING applications from users B, C, and D
- **When**: The gig owner accepts users B and C
- **Then**: B is ACCEPTED, C is ACCEPTED, D is still PENDING, gig status is still OPEN

## TC-APP-007: Cannot apply to non-gig event

- **Spec scenario**: S-APP-7
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Event E has type EVENT (not GIG)
- **When**: User B sends `POST /gigs/E/applications`
- **Then**: The API responds with 400 Bad Request

## TC-APP-008: Cannot apply to cancelled gig

- **Spec scenario**: S-APP-8
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Gig G has status CANCELLED
- **When**: User B sends `POST /gigs/G/applications`
- **Then**: The API responds with 400 Bad Request

## TC-APP-009: Cannot change status of non-PENDING application

- **Spec scenario**: S-APP-9
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User B's application to gig G has status ACCEPTED
- **When**: The gig owner sends `PATCH` with `{ status: "REJECTED" }`
- **Then**: The API responds with 400 Bad Request; application status remains ACCEPTED

## TC-APP-010: Apply button on gig detail page — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 2
- **Regression**: Always
- **Steps**:
  1. Sign in as a user who does NOT own the gig
  2. Navigate to a gig detail page
  3. Click the "Apply" button
  4. Enter an optional message and submit
- **Expected**: Application is created; UI shows confirmation

## TC-APP-011: "My Applications" view — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 2
- **Regression**: Always
- **Steps**:
  1. Sign in as a user who has applied to multiple gigs
  2. Navigate to "My Applications" page
  3. Verify all applications are listed with their current statuses
- **Expected**: All submitted applications are visible with correct status (PENDING/ACCEPTED/REJECTED)

## TC-APP-012: "Manage Applications" view — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 2
- **Regression**: Always
- **Steps**:
  1. Sign in as a gig owner with multiple applications
  2. Navigate to the gig's "Manage Applications" view
  3. Accept one applicant, reject another
  4. Verify status updates are reflected immediately
- **Expected**: Statuses update in real-time; remaining applications are still actionable

## TC-APP-013: Application succeeds when APPLY interaction recording fails

- **Spec scenario**: S-APP-1
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User B is authenticated, gig G exists owned by user A, and interaction persistence fails
- **When**: User B sends `POST /gigs/G/applications` with `{ message: "I'm interested" }`
- **Then**: The API still responds with 201 Created and the application is created with status PENDING

## TC-APP-014: Current user can list their applications across gigs

- **Spec scenario**: —
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: The authenticated user has applied to multiple gigs
- **When**: The client requests the current user's application list
- **Then**: The API returns the user's applications with gig summaries, ordered newest first

## TC-APP-015: API rejects applications to a non-open gig

- **Spec scenario**: —
- **Type**: Automated
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: Gig G has status IN_PROGRESS or COMPLETED
- **When**: A non-owner sends `POST /gigs/G/applications`
- **Then**: The API responds with 400 Bad Request

## TC-APP-016: Gig detail hides apply action for non-open gigs

- **Spec scenario**: —
- **Type**: Automated
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: Gig G has status IN_PROGRESS or COMPLETED
- **When**: A non-owner opens the gig detail page
- **Then**: The apply action is not shown
