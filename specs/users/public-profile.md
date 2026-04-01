# Public Profile

## Overview

Every user has a public-facing personal page that other authenticated users can view. The public profile shows the user's display name, major, interests, created events/gigs, follower count, and following count.

## Endpoint

`GET /api/v1/users/:id` returns the public profile of user :id.

The endpoint also accepts optional `limit` and `offset` query parameters that
page the embedded `createdEvents` list.

## Visible Fields

| Field | Visibility |
|-------|-----------|
| id | Public |
| displayName | Public |
| major | Public |
| gradYear | Public |
| interests | Public |
| followerCount | Public |
| followingCount | Public |
| createdEvents | Public (embedded paginated object with `items` and `meta`) |
| isFollowing | Public (whether the authenticated user follows this user) |
| email | Private (only visible to the user themselves via /api/v1/users/me) |

## Behaviors

### View Public Profile

Any authenticated user can view any other user's public profile. The response includes whether the authenticated user currently follows this user (`isFollowing` boolean).

### Created Events on Profile

The public profile includes the user's active created events/gigs in a nested
`createdEvents` object shaped as `{ items, meta }`. Only `OPEN` and
`IN_PROGRESS` events are shown. The `meta` object reflects the requested
`limit` and `offset`.

### Profile Not Found

If the user ID does not exist, the API responds with 404.

### Invalid Pagination Query

If `limit` or `offset` is present and is not numeric, the API responds with 400
using RFC 7807 Problem Details.

## Scenarios

### S-PUB-1: View another user's profile

```
GIVEN user B exists with displayName "Brutus", major "CS", interests ["sports"]
AND user B has 10 followers and follows 5 users
WHEN user A sends GET /api/v1/users/B
THEN the response contains displayName "Brutus", major "CS", interests ["sports"], followerCount 10, followingCount 5
AND isFollowing indicates whether user A follows user B
```

### S-PUB-2: Email not visible on public profile

```
GIVEN user B exists with email "brutus@osu.edu"
WHEN user A sends GET /api/v1/users/B
THEN the response does not contain the email field
```

### S-PUB-3: Created events on profile

```
GIVEN user B created 3 events (2 OPEN, 1 CANCELLED)
WHEN user A sends GET /api/v1/users/B
THEN the response includes 2 events (the OPEN ones)
AND the CANCELLED event is not included
AND the events are returned in `createdEvents.items`
```

### S-PUB-4: isFollowing is true

```
GIVEN user A follows user B
WHEN user A sends GET /api/v1/users/B
THEN isFollowing is true
```

### S-PUB-5: isFollowing is false

```
GIVEN user A does not follow user B
WHEN user A sends GET /api/v1/users/B
THEN isFollowing is false
```

### S-PUB-6: User not found

```
GIVEN no user exists with id "nonexistent"
WHEN user A sends GET /api/v1/users/nonexistent
THEN the API responds with 404 Not Found
```

### S-PUB-7: Invalid pagination query

```
GIVEN user B exists
WHEN user A sends GET /api/v1/users/B?limit=abc&offset=xyz
THEN the API responds with 400 Bad Request
AND the response uses RFC 7807 Problem Details
```

## Test Cases

See [`test-cases/users/public-profile.md`](../../test-cases/users/public-profile.md) for the full test case registry (TC-PUB-001 through TC-PUB-008), including automated API tests and manual UI verification cases.
