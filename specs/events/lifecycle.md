# Event Lifecycle

## Overview

Events and gigs share the same `Event` entity distinguished by the `type` field (`EVENT` or `GIG`). Both follow the same CRUD operations and status lifecycle. External events (from OSU API or Ticketmaster) behave identically to user-created events except they cannot be created, updated, or deleted by users.

## Status Lifecycle

```
OPEN  ──►  IN_PROGRESS  ──►  COMPLETED
  │                              ▲
  │                              │
  ├──────────► CANCELLED         │ (auto: endAt passes)
  │                              │
  └──► IN_PROGRESS ─────────────┘
```

- **OPEN**: Default status on creation. The event is visible and active.
- **IN_PROGRESS**: The event or gig is currently happening or work has started.
- **COMPLETED**: The event has ended or the gig work is finished.
- **CANCELLED**: The creator cancelled the event/gig.

## Auto-Completion

A scheduled Cloudflare Worker cron trigger runs every 15 minutes. It queries all events where `endAt` is in the past and `status` is not `COMPLETED` or `CANCELLED`, then sets their status to `COMPLETED`. The creator can also manually mark an event as `COMPLETED` before `endAt`.

If an event has no `endAt`, it is never auto-completed — the creator must complete it manually.

## Creation

### Event Creation

Any authenticated user can create an event with type `EVENT`. Required fields: `title`, `description`, `location`, `startAt`. The `source` is set to `USER` and `creatorId` to the authenticated user.

On creation, the system attempts to auto-generate `tags`, `summary`, and `category` using AI tagging. If the AI service is unavailable or times out, the event is still created with `tags` as an empty array and `summary`/`category` as null. AI tagging failure does not block event creation.

### Gig Creation

Same as event creation but with type `GIG`. The `compensation` field is available for gigs.

## Scenarios

### S-EVT-1: Create an event

```
GIVEN user A is authenticated
WHEN user A sends POST /events with { title: "Hackathon", description: "24hr hackathon", type: "EVENT", location: { name: "Ohio Union" }, startAt: "2025-04-01T09:00:00Z" }
THEN an Event is created with status OPEN, source USER, creatorId = user A's id
AND the system generates tags for the event
```

### S-EVT-2: Create a gig

```
GIVEN user A is authenticated
WHEN user A sends POST /events with { title: "Need a tutor", description: "Calculus tutor needed", type: "GIG", location: { name: "Thompson Library" }, startAt: "2025-04-05T14:00:00Z", compensation: { amount: 25, currency: "USD", type: "HOURLY" } }
THEN an Event is created with type GIG, status OPEN, compensation { amount: 25, currency: "USD", type: "HOURLY" }
```

### S-EVT-3: Read single event

```
GIVEN event E exists
WHEN any authenticated user sends GET /events/E
THEN the response contains the full event details
```

### S-EVT-4: List events with filters

```
GIVEN events exist with various types, categories, and dates
WHEN a user sends GET /events?type=EVENT&category=music&startDate=2025-04-01
THEN the response contains only events matching all filters
AND results are paginated with limit and offset params
```

The optional `user` query parameter filters results to events created by a specific user ID.

### S-EVT-5: Update own event

```
GIVEN user A created event E with title "Hackathon"
WHEN user A sends PATCH /events/E with { title: "Mega Hackathon" }
THEN event E's title is "Mega Hackathon"
```

### S-EVT-6: Delete own event

```
GIVEN user A created event E
WHEN user A sends DELETE /events/E
THEN event E is removed from the system
```

### S-EVT-7: Cannot modify external event

```
GIVEN event E has source OSU_API
WHEN any user sends PATCH /events/E or DELETE /events/E
THEN the API responds with 403 Forbidden
```

### S-EVT-8: Cancel an event

```
GIVEN user A created event E with status OPEN
WHEN user A sends PATCH /events/E with { status: "CANCELLED" }
THEN event E's status is CANCELLED
```

### S-EVT-9: Manual completion

```
GIVEN user A created event E with status IN_PROGRESS
WHEN user A sends PATCH /events/E with { status: "COMPLETED" }
THEN event E's status is COMPLETED
```

### S-EVT-10: Auto-completion after endAt

```
GIVEN event E has status OPEN and endAt "2025-04-01T18:00:00Z"
WHEN the auto-completion cron runs after "2025-04-01T18:00:00Z"
THEN event E's status is set to COMPLETED
```

### S-EVT-11: No auto-completion without endAt

```
GIVEN event E has status OPEN and endAt is null
WHEN the auto-completion cron runs
THEN event E's status remains OPEN
```

### S-EVT-12: AI auto-tagging on creation

```
GIVEN user A creates an event with title "Jazz Night at the Union" and description "Live jazz performance featuring student musicians"
WHEN the event is saved
THEN the system generates tags such as ["jazz", "music", "live-performance", "student"]
AND generates a category such as "music"
AND generates a short summary
```

### S-EVT-13: AI tagging failure does not block creation

```
GIVEN the AI service is unavailable
WHEN user A creates an event
THEN the event is created with tags = [], summary = null, category = null
AND the API responds with 201 (not an error)
```

### S-EVT-14: Delete event cascades

```
GIVEN user A created event E
AND event E has 3 applications, 5 interactions, and appears in 2 collections
WHEN user A sends DELETE /events/E
THEN event E, its 3 applications, 5 interactions, and 2 collection items are all deleted
```

### S-EVT-15: Filter events by source

```
GIVEN events exist from sources USER, OSU_API, and TICKETMASTER
WHEN a user sends GET /events?source=TICKETMASTER
THEN the response contains only events with source TICKETMASTER
```

### S-EVT-16: Update gig after applications exist

```
GIVEN user A created gig G with compensation { amount: 20, type: "HOURLY" }
AND gig G has 2 pending applications
WHEN user A sends PATCH /events/G with { compensation: { amount: 25, type: "HOURLY" } }
THEN gig G's compensation amount is updated to 25
AND existing applications are not affected
```

## Test Cases

See [`test-cases/events/lifecycle.md`](../../test-cases/events/lifecycle.md) for the full test case registry (TC-EVT-001 through TC-EVT-020), including automated API tests, cron verification, and manual UI cases for creation, listing, detail, and edit forms.
