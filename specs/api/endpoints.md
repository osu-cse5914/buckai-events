# API Endpoints

## Overview

Authenticated application endpoints are prefixed with `/api/v1` and require a
valid Clerk JWT in the `Authorization: Bearer <token>` header unless noted
otherwise.

Successful single-resource responses return the resource directly:

```json
{
  "id": "user_123",
  "displayName": "Carmen"
}
```

Event-list endpoints return a list plus pagination metadata shaped as `{ data, pagination }`:

```json
{
  "data": [{ "id": "evt_123", "title": "Hack Night" }],
  "pagination": { "total": 100, "limit": 20, "offset": 0 }
}
```

Recommendation endpoints return section items plus metadata shaped as `{ items, meta }`:

```json
{
  "items": [{ "id": "evt_123", "title": "Hack Night" }],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "rankingMode": "PERSONALIZED"
  }
}
```

Route-specific exceptions:

- `GET /api/v1/users/:id` embeds `createdEvents` as `{ items, meta }`
- `GET /api/v1/admin/ai-pipeline/jobs` returns a bare array of jobs

Error responses use RFC 7807 Problem Details with the appropriate HTTP status
code:

```json
{
  "type": "https://social-osu.app/problems/not-found",
  "title": "Resource not found",
  "status": 404,
  "detail": "Event evt_123 was not found"
}
```

Most paginated endpoints use `limit` (default 20, max 100) and `offset`
(default 0). Exceptions: `GET /api/v1/events/semantic-search` uses `limit`
default 10, max 25; `GET /api/v1/admin/ai-pipeline/jobs` uses `limit` default
10, max 25. All timestamps are UTC (ISO 8601).

## System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Unauthenticated API health check returning `service`, `status`, and `timestamp` |

## Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/auth/me` | Get the authenticated request-context user (`id`, `clerkId`, `email`, `role`) |

## Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Get authenticated user's profile, including persisted `role` |
| PATCH | `/api/v1/users/me` | Update profile fields (`role`, `email`, `id`, and `clerkId` remain immutable) |
| GET | `/api/v1/users/me/applications` | List the authenticated user's gig applications with gig summaries. Params: `limit`, `offset` |
| GET | `/api/v1/users/:id` | Get public profile of a user. Params: `limit`, `offset` apply to `createdEvents` |
| POST | `/api/v1/users/:id/follow` | Follow another user. Returns `201` with an empty JSON object |
| DELETE | `/api/v1/users/:id/follow` | Unfollow a user. Returns `204` |
| GET | `/api/v1/users/:id/followers` | List follower profiles for a user. Params: `limit`, `offset` |
| GET | `/api/v1/users/:id/following` | List profiles the user follows. Params: `limit`, `offset` |

## Admin

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/admin/external-ingestion/sync` | Trigger a synchronous external event sync. ADMIN only. Returns `startedAt`, `finishedAt`, and per-source counters |
| GET | `/api/v1/admin/ai-pipeline/jobs` | List recent AI pipeline jobs. ADMIN only. Param: `limit` |
| POST | `/api/v1/admin/ai-pipeline/events/:id/rerun` | Queue an AI pipeline rerun for an event. ADMIN only. Body: `{ mode?: "EMBEDDING" \| "FULL_PIPELINE" }` |
| POST | `/api/v1/admin/ai-pipeline/backfill` | Queue an embedding backfill job. ADMIN only |

## Social Feed

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/social/feed` | Get events from followed users. Params: `limit`, `offset` |

## Events

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/events` | List events. Filters: `type`, `category`, `startDate`, `endDate`, `source`, `status`, `statusMode`, `user`, `search`, `sort`, `limit`, `offset` |
| GET | `/api/v1/events/semantic-search` | Semantic event search. Filters: `query`, `type`, `category`, `startDate`, `endDate`, `limit`, `offset`. Returns the same `{ data, pagination }` envelope as `/api/v1/events` |
| POST | `/api/v1/events` | Create an event or gig |
| GET | `/api/v1/events/:id` | Get a single event with full detail |
| PATCH | `/api/v1/events/:id` | Update event (owner only; forbidden for external events) |
| DELETE | `/api/v1/events/:id` | Delete event (owner only; forbidden for external events). Returns `200` with `{ message: "Event deleted" }` |

## Gig Applications

`:gigId` is an Event ID. The system validates that the event has `type = GIG`. Returns 400 if the event is not a gig.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/gigs/:gigId/applications` | Apply to a gig. Body: `{ message? }` |
| GET | `/api/v1/gigs/:gigId/applications` | List applications (owner sees all; applicant sees only their own). Params: `limit`, `offset` |
| PATCH | `/api/v1/gigs/:gigId/applications/:appId` | Update application status (gig owner only). Body: `{ status }` |

## Collections

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/collections` | List authenticated user's collections, including item counts |
| POST | `/api/v1/collections` | Create a collection |
| GET | `/api/v1/collections/:id` | Get collection with collection items and expanded event payloads (respects visibility) |
| PATCH | `/api/v1/collections/:id` | Update collection (owner only) |
| DELETE | `/api/v1/collections/:id` | Delete collection and items (owner only) |
| POST | `/api/v1/collections/:id/items` | Add event to collection. Body: `{ eventId }` |
| DELETE | `/api/v1/collections/:id/items/:eventId` | Remove event from collection |

## Interactions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/interactions` | Record a user interaction |

## Recommendations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/recommendations` | Get the `Recommended` Featured feed section. Params: `limit`, `offset`, `type`. Response `meta` also includes `rankingMode` |
| GET | `/api/v1/recommendations/popular` | Get the `Popular` Featured preview section. Params: `limit`, `offset`, `type` |
| GET | `/api/v1/recommendations/upcoming` | Get the `Upcoming` Featured preview section. Params: `limit`, `offset`, `type` |
## Conversations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/conversations/:id/messages` | Send a message to an existing conversation; returns streamed SSE response |

## Error Codes

| HTTP Status | Code | When |
|-------------|------|------|
| 400 | BAD_REQUEST | Invalid input, invalid query, invalid status transition, applying to a non-gig event, or applying to a non-open gig |
| 401 | UNAUTHORIZED | Missing or invalid JWT |
| 403 | FORBIDDEN | Ownership violation, self-application to own gig, unauthorized gig-application visibility, or non-admin access to admin endpoints |
| 404 | NOT_FOUND | Resource not found or private resource accessed by a non-owner |
| 409 | CONFLICT | Duplicate application or duplicate collection item |
| 500 | INTERNAL_ERROR | Unexpected server error |
