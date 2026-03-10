# Gig Applications

## Overview

Users apply to gigs by submitting an application with an optional message. The gig owner reviews applications and accepts or rejects them. Multiple applicants can be accepted. A user cannot apply to their own gig.

## Application Lifecycle

```
PENDING  ──►  ACCEPTED
    │
    └──────►  REJECTED
```

- **PENDING**: Default status when an application is submitted.
- **ACCEPTED**: The gig owner accepted the applicant.
- **REJECTED**: The gig owner rejected the applicant.

## Routing Note

Gig application endpoints use `/gigs/:gigId/applications`. The `:gigId` parameter is an Event ID — the system validates that the referenced event has `type = GIG`. If the event has `type = EVENT`, the endpoint responds with 400 Bad Request. There is no separate `gigs` table; `/gigs/` is a routing alias into the `Event` table filtered by type.

## Behaviors

### Applying

Any authenticated user can apply to a gig they do not own. Each user can apply to a given gig only once. The application includes an optional `message` (cover note).

Applying creates an Interaction with action `APPLY`.

### Reviewing Applications

The gig owner can list all applications for their gig. Each application shows the applicant's profile, message, and status.

### Accepting / Rejecting

The gig owner can accept or reject any PENDING application. Accepting one application does not affect other applications — the owner can accept multiple applicants. The gig remains OPEN until the owner manually changes its status.

## Scenarios

### S-APP-1: Apply to a gig

```
GIVEN user B is authenticated
AND gig G exists, owned by user A
WHEN user B sends POST /gigs/G/applications with { message: "I'm interested" }
THEN an Application is created with status PENDING, applicantId = user B, gigId = G
AND an Interaction is created with action APPLY for user B on event G
```

### S-APP-2: Cannot apply to own gig

```
GIVEN user A created gig G
WHEN user A sends POST /gigs/G/applications
THEN the API responds with 403 Forbidden
```

### S-APP-3: Cannot apply twice

```
GIVEN user B already applied to gig G
WHEN user B sends POST /gigs/G/applications again
THEN the API responds with 409 Conflict
```

### S-APP-4: Accept an application

```
GIVEN gig G has a PENDING application from user B
WHEN the gig owner sends PATCH /gigs/G/applications/app1 with { status: "ACCEPTED" }
THEN the application status is ACCEPTED
```

### S-APP-5: Reject an application

```
GIVEN gig G has a PENDING application from user B
WHEN the gig owner sends PATCH /gigs/G/applications/app1 with { status: "REJECTED" }
THEN the application status is REJECTED
```

### S-APP-6: Accept multiple applicants

```
GIVEN gig G has PENDING applications from user B, user C, and user D
WHEN the gig owner accepts user B and user C
THEN user B's application is ACCEPTED
AND user C's application is ACCEPTED
AND user D's application is still PENDING
AND gig G's status is still OPEN
```

### S-APP-7: Cannot apply to non-gig event

```
GIVEN event E has type EVENT (not GIG)
WHEN user B sends POST /gigs/E/applications
THEN the API responds with 400 Bad Request
```

### S-APP-8: Cannot apply to cancelled gig

```
GIVEN gig G has status CANCELLED
WHEN user B sends POST /gigs/G/applications
THEN the API responds with 400 Bad Request
```

### S-APP-9: Cannot change status of non-PENDING application

```
GIVEN user B's application to gig G has status ACCEPTED
WHEN the gig owner sends PATCH /gigs/G/applications/app1 with { status: "REJECTED" }
THEN the API responds with 400 Bad Request
AND the application status remains ACCEPTED
```

## Test Cases

See [`test-cases/events/gig-applications.md`](../../test-cases/events/gig-applications.md) for the full test case registry (TC-APP-001 through TC-APP-012), including automated API tests and manual UI cases for the apply, manage, and review flows.

