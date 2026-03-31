# User Profile

## Overview

Users have a profile with optional fields for display name, major, graduation year, and interests. The profile is created automatically on first authentication. Users update their own profile only.

## Behaviors

### Profile Read

`GET /users/me` returns the authenticated user's profile including all fields, their selected interests, and their persisted app `role`.

### Profile Update

`PATCH /users/me` accepts partial updates to: `displayName`, `major`, `gradYear`, `interests`. Other fields (`id`, `email`, `clerkId`, `role`, `createdAt`) are immutable via this endpoint.

### Interests

Interests are an array of category strings selected by the user. They are used as explicit signals by the recommendation model.

## Scenarios

### S-USER-1: Get own profile

```
GIVEN user A is authenticated
WHEN user A sends GET /users/me
THEN the response contains user A's id, email, displayName, major, gradYear, interests, createdAt, updatedAt
AND the response contains user A's role
```

### S-USER-2: Update display name

```
GIVEN user A is authenticated
WHEN user A sends PATCH /users/me with { "displayName": "Brutus" }
THEN user A's displayName is "Brutus"
AND updatedAt is refreshed
```

### S-USER-3: Update interests

```
GIVEN user A is authenticated
WHEN user A sends PATCH /users/me with { "interests": ["music", "sports", "tech"] }
THEN user A's interests are ["music", "sports", "tech"]
```

### S-USER-4: Partial update preserves other fields

```
GIVEN user A has displayName "Brutus" and major "CS"
WHEN user A sends PATCH /users/me with { "major": "ECE" }
THEN user A's major is "ECE"
AND user A's displayName is still "Brutus"
```

### S-USER-5: Cannot update email

```
GIVEN user A is authenticated
WHEN user A sends PATCH /users/me with { "email": "new@osu.edu" }
THEN the email field is ignored
AND user A's email is unchanged
```

### S-USER-6: Cannot update role

```
GIVEN user A is authenticated with role USER
WHEN user A sends PATCH /users/me with { "role": "ADMIN" }
THEN the role field is ignored
AND user A's role remains USER
```

## Test Cases

See [`test-cases/users/profile.md`](../../test-cases/users/profile.md) for the full test case registry (TC-USER-001 through TC-USER-010), including automated API tests and manual UI verification cases.
