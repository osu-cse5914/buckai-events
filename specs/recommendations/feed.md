# Recommendation Feed

**Status**: Shipped

## Overview

The recommendation feed is the primary discovery surface for the `Featured` page. It presents a sectioned discovery layout built on the current interim recommendation model (see [model.md](../recommendations/model.md)):

- `Recommended`: personalized or fallback-ranked feed, paginated
- `Popular`: short-list preview of what is getting the most attention
- `Upcoming`: short-list preview of near-term opportunities

Users can filter each section by type.

## Endpoints

### `GET /recommendations`

Returns the `Recommended` feed section.

#### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | Int | 20 | Number of items to return |
| offset | Int | 0 | Pagination offset |
| type | EventType? | null | Filter by EVENT or GIG. Null returns both (blended) |
| search | String? | null | Non-semantic keyword filter applied before pagination |

#### Response

Returns `{ items, meta }`, where `items` is an array of Event objects ranked by recommendation score. `meta` includes `total`, `limit`, `offset`, and `rankingMode`.

`rankingMode` values:

- `PERSONALIZED`
- `POPULARITY_FALLBACK`

### `GET /recommendations/popular`

Returns the `Popular` Featured preview section. Supports `limit`, `offset`, and `type`.

Supports `limit`, `offset`, `type`, and `search`.

Response shape: `{ items, meta }`, where `meta` includes `total`, `limit`, and `offset`.

### `GET /recommendations/upcoming`

Returns the `Upcoming` Featured preview section. Supports `limit`, `offset`, and `type`.

Response shape: `{ items, meta }`, where `meta` includes `total`, `limit`, and `offset`.

## Behaviors

### Blended Feed (default)

When no `type` filter is applied, events and gigs are ranked together in a single list by recommendation score. The model does not impose a fixed ratio between events and gigs.

### Filtered Feed

When `type=EVENT` is specified, only events are returned. When `type=GIG`, only gigs. The ranking within the filtered set is still personalized.

### Empty State

For new users with no interactions and no interests, the feed falls back to a popularity-based ranking (events sorted by total interaction count, then by recency).

### Keyword Search

The `Featured` page may pass a keyword search query to the recommendation section endpoints. Keyword search is non-semantic and does not depend on embeddings. It narrows the `Recommended`, `Popular`, and `Upcoming` recommendation sections before pagination while preserving each section's ranking model. The social `Following` lane is not part of keyword search because it is an activity feed rather than a recommendation endpoint.

### Featured Page Composition

The `Featured` page loads the three recommendation endpoints independently so the personalized feed, popularity preview, and upcoming preview can fail or update independently without collapsing into a single blended response.

## Scenarios

### S-FEED-1: Blended feed default

```
GIVEN user A has interactions with both events and gigs
WHEN user A sends GET /recommendations
THEN the response contains a mix of events and gigs
AND items are ordered by personalized recommendation score
```

### S-FEED-2: Filter by event type

```
GIVEN user A sends GET /recommendations?type=EVENT
THEN the response contains only items with type EVENT
AND items are ordered by personalized recommendation score
```

### S-FEED-3: Filter by gig type

```
GIVEN user A sends GET /recommendations?type=GIG
THEN the response contains only items with type GIG
```

### S-FEED-4: Pagination

```
GIVEN user A has 50 recommended items
WHEN user A sends GET /recommendations?limit=10&offset=20
THEN the response contains items 21-30
AND meta.total is 50
```

### S-FEED-5: New user empty state

```
GIVEN user A has no interactions and no interests
WHEN user A sends GET /recommendations
THEN the response contains events sorted by popularity (interaction count) then recency
```

### S-FEED-11: Featured loads sectioned recommendation surfaces

```
GIVEN the authenticated user opens Featured
WHEN the page loads recommendation data
THEN the page renders Recommended, Popular, and Upcoming sections
AND each section can be filtered by type without changing the underlying interim ranking model
```

### S-FEED-12: Featured keyword search narrows recommendation sections

```
GIVEN the authenticated user is on Featured
WHEN the user enters a keyword search query
THEN Recommended, Popular, and Upcoming reload with the query
AND ranking, pagination, empty states, and error states remain scoped per section
AND the search does not use semantic embeddings
```

### S-FEED-6: Cache hit [WIP — deferred to custom model phase]

```
GIVEN user A's recommendations were computed within the cache TTL
WHEN user A sends GET /recommendations
THEN the response is served from cache
```

### S-FEED-7: Cache invalidation on interaction [WIP — deferred to custom model phase]

```
GIVEN user A's recommendations are cached
WHEN user A records a new interaction
THEN the cache is invalidated
AND the next GET /recommendations recomputes the ranking
```

## Test Cases

See [`test-cases/recommendations/feed.md`](../../test-cases/recommendations/feed.md) for the full test case registry (TC-FEED-001 through TC-FEED-016), including automated Featured-section coverage and manual UI verification.
