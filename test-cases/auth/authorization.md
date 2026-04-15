# Authorization Test Cases

Spec: [`authorization`](../../specs/auth/authorization.md)

---

## TC-AUTHZ-001: Owner updates their event

- **Spec scenario**: S-AUTHZ-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E
- **When**: User A sends `PATCH /events/E`
- **Then**: The event is updated

## TC-AUTHZ-002: Non-owner cannot update event

- **Spec scenario**: S-AUTHZ-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E
- **When**: User B sends `PATCH /events/E`
- **Then**: The API responds with 403 Forbidden

## TC-AUTHZ-003: Non-owner cannot delete event

- **Spec scenario**: S-AUTHZ-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E
- **When**: User B sends `DELETE /events/E`
- **Then**: The API responds with 403 Forbidden

## TC-AUTHZ-004: Gig owner cannot apply to own gig

- **Spec scenario**: S-AUTHZ-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A created gig G
- **When**: User A sends `POST /gigs/G/applications`
- **Then**: The API responds with 403 Forbidden

## TC-AUTHZ-005: Gig owner views all applications

- **Spec scenario**: S-AUTHZ-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A created gig G with 3 applications
- **When**: User A sends `GET /gigs/G/applications`
- **Then**: The response contains all 3 applications

## TC-AUTHZ-006: Non-owner cannot view gig applications

- **Spec scenario**: S-AUTHZ-6
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A created gig G
- **When**: User B (not an applicant) sends `GET /gigs/G/applications`
- **Then**: The API responds with 403 Forbidden

## TC-AUTHZ-007: Applicant views own application only

- **Spec scenario**: S-AUTHZ-7
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User B applied to gig G owned by user A
- **When**: User B sends `GET /gigs/G/applications`
- **Then**: The response contains only user B's application

## TC-AUTHZ-008: Only gig owner updates application status

- **Spec scenario**: S-AUTHZ-8
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/gigs.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A created gig G, user B applied
- **When**: User B sends `PATCH /gigs/G/applications/app1`
- **Then**: The API responds with 403 Forbidden

## TC-AUTHZ-009: Public collection visible to others

- **Spec scenario**: S-AUTHZ-9
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has a collection with visibility PUBLIC
- **When**: User B sends `GET /collections/:id`
- **Then**: The response contains the collection and its items

## TC-AUTHZ-010: Private collection hidden from others

- **Spec scenario**: S-AUTHZ-10
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has a collection with visibility PRIVATE
- **When**: User B sends `GET /collections/:id`
- **Then**: The API responds with 404 Not Found

## TC-AUTHZ-011: Non-owner cannot modify another user's collection

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A owns collection C
- **When**: User B attempts to rename or delete collection C via the API
- **Then**: The API rejects the mutation and collection C is unchanged

## TC-AUTHZ-012: Cannot access another user's conversation

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/conversations.test.ts`
- **Phase introduced**: 5
- **Regression**: Always
- **Given**: User A owns conversation C
- **When**: User B sends `POST /conversations/C/messages`
- **Then**: The API responds with 404 Not Found

## TC-AUTHZ-013: Non-admin cannot trigger manual external sync

- **Spec scenario**: S-AUTHZ-11
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/admin-external-ingestion.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: An authenticated user with role `USER`
- **When**: The user sends `POST /admin/external-ingestion/sync`
- **Then**: The API responds with 403 Forbidden

## TC-AUTHZ-014: Admin can trigger manual external sync

- **Spec scenario**: S-AUTHZ-12
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/admin-external-ingestion.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: An authenticated user with role `ADMIN`
- **When**: The user sends `POST /admin/external-ingestion/sync`
- **Then**: The API responds with 200 OK and invokes the external sync service once

## TC-AUTHZ-015: Non-admin cannot rerun the AI pipeline

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/admin-ai-pipeline.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: An authenticated user with role `USER`
- **When**: The user sends `POST /admin/ai-pipeline/events/:id/rerun`
- **Then**: The API responds with 403 Forbidden
- **And**: No rerun job is created

## TC-AUTHZ-016: Non-admin cannot start embedding backfill

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/admin-ai-pipeline.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: An authenticated user with role `USER`
- **When**: The user sends `POST /admin/ai-pipeline/backfill`
- **Then**: The API responds with 403 Forbidden
- **And**: No backfill job is created
