# Social Feed

## Overview

The social feed shows events created or saved by users that the authenticated user follows. It is separate from the recommendation feed — the social feed is driven by follow relationships, not by personalized scoring.

## Behaviors

### Feed Content

The social feed aggregates:

- Events **created** by followed users (type = USER source events/gigs).
- Events **saved** to public collections by followed users.

Each feed item includes the event details and the action context (who created/saved it and when).

### Ordering

Feed items are ordered by the action timestamp (when the followed user created or saved the event), most recent first.

### Pagination

`GET /social/feed` accepts `limit` and `offset` for pagination.

### Empty Feed

If the user follows nobody, the feed is empty. The frontend suggests users to follow based on shared interests or major.

## Endpoint

`GET /api/social/feed`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | Int | 20 | Items per page |
| offset | Int | 0 | Pagination offset |

### Response Item Shape

```json
{
  "event": { ... },
  "action": "created" | "saved",
  "actor": { "id": "...", "displayName": "..." },
  "actionAt": "2025-04-01T10:00:00Z"
}
```

## Scenarios

### S-SFEED-1: See events created by followed users

```
GIVEN user A follows user B
AND user B created event E
WHEN user A sends GET /api/social/feed
THEN the feed contains event E with action "created" and actor = user B
```

### S-SFEED-2: See events saved by followed users

```
GIVEN user A follows user B
AND user B saved event E to a PUBLIC collection
WHEN user A sends GET /api/social/feed
THEN the feed contains event E with action "saved" and actor = user B
```

### S-SFEED-3: Private collection saves not in feed

```
GIVEN user A follows user B
AND user B saved event E to a PRIVATE collection
WHEN user A sends GET /api/social/feed
THEN event E does not appear in user A's feed (from user B's save)
```

### S-SFEED-4: Feed ordering

```
GIVEN user A follows user B and user C
AND user B created event E1 at T1
AND user C saved event E2 at T2 (T2 > T1)
WHEN user A sends GET /api/social/feed
THEN E2 appears before E1
```

### S-SFEED-5: Empty feed

```
GIVEN user A follows nobody
WHEN user A sends GET /api/social/feed
THEN the response contains an empty data array
```

### S-SFEED-6: Pagination

```
GIVEN user A's social feed has 50 items
WHEN user A sends GET /api/social/feed?limit=10&offset=10
THEN the response contains items 11-20
AND meta.total is 50
```

### S-SFEED-7: Unfollowed user's events disappear

```
GIVEN user A follows user B and sees user B's events in the feed
WHEN user A unfollows user B
THEN user B's events no longer appear in user A's social feed
```

### S-SFEED-8: Same event created and saved appears once

```
GIVEN user A follows user B
AND user B created event E
AND user B also saved event E to a PUBLIC collection
WHEN user A sends GET /api/social/feed
THEN event E appears once with action "created" (creation takes precedence)
```

### S-SFEED-9: Same event saved to multiple public collections appears once

```
GIVEN user A follows user B
AND user B saved event E to PUBLIC collection C1 and PUBLIC collection C2
WHEN user A sends GET /api/social/feed
THEN event E appears once (deduplicated by event ID per actor)
AND actionAt is the earliest save timestamp
```
