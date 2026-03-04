# API Endpoints

## Overview

All endpoints are prefixed with `/api/v1`. All endpoints require a valid Clerk JWT in the `Authorization: Bearer <token>` header.

Successful responses return the resource directly:

```json
{
  "id": "user_123",
  "displayName": "Carmen"
}
```

Paginated responses return a list plus pagination metadata:

```json
{
  "items": [{ "id": "evt_123", "title": "Hack Night" }],
  "meta": { "total": 100, "limit": 20, "offset": 0 }
}
```

Error responses use RFC 7807 Problem Details with the appropriate HTTP status code:

```json
{
  "type": "https://social-osu.app/problems/not-found",
  "title": "Resource not found",
  "status": 404,
  "detail": "Event evt_123 was not found"
}
```

All paginated endpoints use `limit` (default 20, max 100) and `offset` (default 0). All timestamps are UTC (ISO 8601).

## Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Get authenticated user's profile |
| PATCH | `/api/v1/users/me` | Update profile fields |
| GET | `/api/v1/users/:id` | Get public profile of a user |
| POST | `/api/v1/users/:id/follow` | Follow a user |
| DELETE | `/api/v1/users/:id/follow` | Unfollow a user |
| GET | `/api/v1/users/:id/followers` | List a user's followers. Params: `limit`, `offset` |
| GET | `/api/v1/users/:id/following` | List users that a user follows. Params: `limit`, `offset` |

## Social Feed

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/social/feed` | Get events from followed users. Params: `limit`, `offset` |

## Events

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/events` | List events. Filters: `type`, `category`, `startDate`, `endDate`, `source`, `status`, `search`, `limit`, `offset` |
| POST | `/api/v1/events` | Create an event or gig |
| GET | `/api/v1/events/:id` | Get single event with full detail |
| PATCH | `/api/v1/events/:id` | Update event (owner only; forbidden for external events) |
| DELETE | `/api/v1/events/:id` | Delete event (owner only; forbidden for external events) |

## Gig Applications

`:gigId` is an Event ID. The system validates that the event has `type = GIG`. Returns 400 if the event is not a gig.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/gigs/:gigId/applications` | Apply to a gig. Body: `{ message? }` |
| GET | `/api/v1/gigs/:gigId/applications` | List applications (owner sees all; applicant sees own). Params: `limit`, `offset` |
| PATCH | `/api/v1/gigs/:gigId/applications/:appId` | Update application status (gig owner only). Body: `{ status }` |

## Collections

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/collections` | List authenticated user's collections |
| POST | `/api/v1/collections` | Create a collection |
| GET | `/api/v1/collections/:id` | Get collection with items (respects visibility) |
| PATCH | `/api/v1/collections/:id` | Update collection (owner only) |
| DELETE | `/api/v1/collections/:id` | Delete collection and items (owner only) |
| GET | `/api/v1/collections/:id/items` | List events in collection. Params: `limit`, `offset` |
| POST | `/api/v1/collections/:id/items` | Add event to collection. Body: `{ eventId }` |
| DELETE | `/api/v1/collections/:id/items/:eventId` | Remove event from collection |

## Interactions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/interactions` | Record a user interaction |

## Recommendations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/recommendations` | Get personalized feed. Params: `limit`, `offset`, `type` |

## Conversations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/conversations` | List user's conversations. Params: `limit`, `offset` |
| POST | `/api/v1/conversations` | Create a new conversation |
| GET | `/api/v1/conversations/:id/messages` | Get message history. Params: `limit`, `offset` |
| POST | `/api/v1/conversations/:id/messages` | Send message; returns streamed SSE response |

## Error Codes

| HTTP Status | Code | When |
|-------------|------|------|
| 400 | BAD_REQUEST | Invalid input, applying to non-gig event, applying to cancelled gig |
| 401 | UNAUTHORIZED | Missing or invalid JWT |
| 403 | FORBIDDEN | Ownership violation, self-application to own gig |
| 404 | NOT_FOUND | Resource not found or private resource accessed by non-owner |
| 409 | CONFLICT | Duplicate application, duplicate collection item, duplicate follow |
| 500 | INTERNAL_ERROR | Unexpected server error |
