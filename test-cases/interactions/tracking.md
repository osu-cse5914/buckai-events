# Interaction Tracking Test Cases

Spec: [`tracking`](../../specs/interactions/tracking.md)

---

## TC-INT-001: Record a view

- **Spec scenario**: S-INT-1
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A is authenticated and event E exists
- **When**: User A sends `POST /interactions` with `{ eventId: E, action: "VIEW" }`
- **Then**: An Interaction is created with userId = user A, eventId = E, action = VIEW

## TC-INT-002: Record a dismiss

- **Spec scenario**: S-INT-2
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A sees event E in recommendations
- **When**: User A sends `POST /interactions` with `{ eventId: E, action: "DISMISS" }`
- **Then**: An Interaction is created with action DISMISS

## TC-INT-003: Multiple views recorded separately

- **Spec scenario**: S-INT-3
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A viewed event E once already
- **When**: User A sends `POST /interactions` with `{ eventId: E, action: "VIEW" }` again
- **Then**: A second Interaction record is created (not deduplicated)

## TC-INT-004: Interaction with nonexistent event

- **Spec scenario**: S-INT-4
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: No event exists with id `"nonexistent"`
- **When**: User A sends `POST /interactions` with `{ eventId: "nonexistent", action: "VIEW" }`
- **Then**: The API responds with 404 Not Found
