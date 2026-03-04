# Follows

## Overview

Users can follow other users. Following is asymmetric — user A can follow user B without B following A. Following determines what appears in the social event feed.

## Behaviors

### Follow a User

`POST /users/:id/follow` creates a follow relationship from the authenticated user to the target user. A user cannot follow themselves.

### Unfollow a User

`DELETE /users/:id/follow` removes the follow relationship.

### Follower / Following Lists

- `GET /users/:id/followers` returns the list of users who follow user :id.
- `GET /users/:id/following` returns the list of users that user :id follows.

Both are publicly visible on any user's profile.

### Follow Counts

The follower and following counts are included in the user profile response.

## Scenarios

### S-FOL-1: Follow a user

```
GIVEN user A is authenticated and user B exists
WHEN user A sends POST /users/B/follow
THEN a Follow record is created (followerId = A, followeeId = B)
AND user B's follower count increases by 1
AND user A's following count increases by 1
```

### S-FOL-2: Cannot follow yourself

```
GIVEN user A is authenticated
WHEN user A sends POST /users/A/follow
THEN the API responds with 400 Bad Request
```

### S-FOL-3: Cannot follow twice

```
GIVEN user A already follows user B
WHEN user A sends POST /users/B/follow
THEN the API responds with 409 Conflict
```

### S-FOL-4: Unfollow a user

```
GIVEN user A follows user B
WHEN user A sends DELETE /users/B/follow
THEN the Follow record is deleted
AND user B's follower count decreases by 1
AND user A's following count decreases by 1
```

### S-FOL-5: Unfollow when not following

```
GIVEN user A does not follow user B
WHEN user A sends DELETE /users/B/follow
THEN the API responds with 404 Not Found
```

### S-FOL-6: List followers

```
GIVEN user B has 3 followers
WHEN any authenticated user sends GET /users/B/followers
THEN the response contains 3 user profiles
```

### S-FOL-7: List following

```
GIVEN user A follows 5 users
WHEN any authenticated user sends GET /users/A/following
THEN the response contains 5 user profiles
```

