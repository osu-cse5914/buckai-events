# Recommendation Feed

## Overview

The recommendation feed is the primary discovery surface. It presents a blended list of events and gigs ranked by the recommendation model (currently interim heuristic ranking — see [model.md](../recommendations/model.md)). Users can filter by type.

## Endpoint

`GET /recommendations` returns the personalized feed.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | Int | 20 | Number of items to return |
| offset | Int | 0 | Pagination offset |
| type | EventType? | null | Filter by EVENT or GIG. Null returns both (blended) |

### Response

Returns a paginated response shaped as `{ items, meta }`, where `items` is an array of Event objects ranked by recommendation score. The `meta` object includes `total`, `limit`, `offset`.

## Behaviors

### Blended Feed (default)

When no `type` filter is applied, events and gigs are ranked together in a single list by recommendation score. The model does not impose a fixed ratio between events and gigs.

### Filtered Feed

When `type=EVENT` is specified, only events are returned. When `type=GIG`, only gigs. The ranking within the filtered set is still personalized.

### Empty State

For new users with no interactions and no interests, the feed falls back to a popularity-based ranking (events sorted by total interaction count, then by recency).

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
