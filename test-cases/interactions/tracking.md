# Interaction Tracking Test Cases

Spec: [`tracking`](../../specs/interactions/tracking.md)

---

## TC-INT-001: Record a view

- **Spec scenario**: S-INT-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/interactions.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A is authenticated and event E exists
- **When**: User A sends `POST /interactions` with `{ eventId: E, action: "VIEW" }`
- **Then**: An Interaction is created with userId = user A, eventId = E, action = VIEW

## TC-INT-002: Record a dismiss

- **Spec scenario**: S-INT-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/interactions.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A sees event E in recommendations
- **When**: User A sends `POST /interactions` with `{ eventId: E, action: "DISMISS" }`
- **Then**: An Interaction is created with action DISMISS

## TC-INT-003: Multiple views recorded separately

- **Spec scenario**: S-INT-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/interactions.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A viewed event E once already
- **When**: User A sends `POST /interactions` with `{ eventId: E, action: "VIEW" }` again
- **Then**: A second Interaction record is created (not deduplicated)

## TC-INT-004: Interaction with nonexistent event

- **Spec scenario**: S-INT-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/interactions.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: No event exists with id `"nonexistent"`
- **When**: User A sends `POST /interactions` with `{ eventId: "nonexistent", action: "VIEW" }`
- **Then**: The API responds with 404 Not Found

## TC-INT-005: Record a view from the event detail page

- **Spec scenario**: S-INT-1
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A opens event E in the full detail page
- **When**: The event detail surface finishes loading
- **Then**: The web app sends `POST /interactions` with `{ eventId: E, action: "VIEW" }`
- **And**: A query refetch while the same detail view stays open does not send a duplicate VIEW

## TC-INT-006: Record a view from the split-view preview pane

- **Spec scenario**: S-INT-1
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A is browsing events in the desktop split-view layout
- **When**: User A selects event E and the preview pane opens
- **Then**: The web app sends `POST /interactions` with `{ eventId: E, action: "VIEW" }`

## TC-INT-007: Record a click on the ticket link

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: Event E has a `ticketUrl` and User A is on its detail page
- **When**: User A clicks the ticket link CTA
- **Then**: The web app sends `POST /interactions` with `{ eventId: E, action: "CLICK" }`
- **And**: The outbound ticket link still opens even if interaction tracking fails
