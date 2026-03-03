# Interaction Tracking

## Overview

The system captures implicit user signals as Interaction records. These signals feed the recommendation model to personalize the event feed. Interactions are write-only from the user's perspective — users do not read or manage their interaction history directly.

## Interaction Types

| Action | Trigger | Weight Hint |
|--------|---------|-------------|
| VIEW | User opens event detail page | Low |
| SAVE | User adds event to a collection | High |
| CLICK | User clicks an external link (ticketUrl) | Medium |
| APPLY | User applies to a gig | High |
| DISMISS | User explicitly dismisses a recommendation | Negative |

## Behaviors

### Recording

`POST /interactions` accepts `{ eventId, action }`. The `userId` is extracted from the authenticated context. Interactions are append-only — they are never updated or deleted.

### Dedup

Multiple interactions of the same type for the same user-event pair are allowed (e.g., a user may VIEW an event multiple times). Each is recorded as a separate row with its own timestamp.

### Automatic Recording

Some interactions are recorded automatically by other operations:

- Applying to a gig creates an `APPLY` interaction (see gig-applications spec).
- Adding an event to a collection creates a `SAVE` interaction (see collections spec).

These automatic recordings happen in addition to any explicit `POST /interactions` calls.

## Scenarios

### S-INT-1: Record a view

```
GIVEN user A is authenticated and event E exists
WHEN user A sends POST /interactions with { eventId: E, action: "VIEW" }
THEN an Interaction is created with userId = user A, eventId = E, action = VIEW
```

### S-INT-2: Record a dismiss

```
GIVEN user A sees event E in recommendations
WHEN user A sends POST /interactions with { eventId: E, action: "DISMISS" }
THEN an Interaction is created with action DISMISS
AND future recommendations deprioritize event E for user A
```

### S-INT-3: Multiple views recorded separately

```
GIVEN user A viewed event E once already
WHEN user A sends POST /interactions with { eventId: E, action: "VIEW" } again
THEN a second Interaction record is created (not deduplicated)
```

### S-INT-4: Interaction with nonexistent event

```
GIVEN no event exists with id "nonexistent"
WHEN user A sends POST /interactions with { eventId: "nonexistent", action: "VIEW" }
THEN the API responds with 404 Not Found
```
