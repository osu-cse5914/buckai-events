# Authorization

## Overview

Authorization is ownership-based. There are no admin roles. Users can only modify resources they own.

## Rules

| Resource | Action | Allowed |
|----------|--------|---------|
| Event/Gig | Create | Any authenticated user |
| Event/Gig | Read | Any authenticated user |
| Event/Gig | Update | Creator only |
| Event/Gig | Delete | Creator only |
| Application | Create (apply) | Any authenticated user (not the gig owner) |
| Application | Read (list) | Gig owner sees all; applicant sees their own |
| Application | Update status | Gig owner only |
| Collection | Create | Any authenticated user |
| Collection | Read | Owner always; others only if visibility is PUBLIC |
| Collection | Update | Owner only |
| Collection | Delete | Owner only |
| Conversation | All | Owner only |

## Scenarios

### S-AUTHZ-1: Owner updates their event

```
GIVEN user A created event E
WHEN user A sends PATCH /events/E
THEN the event is updated
```

### S-AUTHZ-2: Non-owner cannot update event

```
GIVEN user A created event E
WHEN user B sends PATCH /events/E
THEN the API responds with 403 Forbidden
```

### S-AUTHZ-3: Non-owner cannot delete event

```
GIVEN user A created event E
WHEN user B sends DELETE /events/E
THEN the API responds with 403 Forbidden
```

### S-AUTHZ-4: Gig owner cannot apply to own gig

```
GIVEN user A created gig G
WHEN user A sends POST /gigs/G/applications
THEN the API responds with 403 Forbidden
```

### S-AUTHZ-5: Gig owner views all applications

```
GIVEN user A created gig G with 3 applications
WHEN user A sends GET /gigs/G/applications
THEN the response contains all 3 applications
```

### S-AUTHZ-6: Non-owner cannot view gig applications

```
GIVEN user A created gig G
WHEN user B (not an applicant) sends GET /gigs/G/applications
THEN the API responds with 403 Forbidden
```

### S-AUTHZ-7: Applicant views own application

```
GIVEN user B applied to gig G owned by user A
WHEN user B sends GET /gigs/G/applications
THEN the response contains only user B's application
```

### S-AUTHZ-8: Only gig owner updates application status

```
GIVEN user A created gig G
AND user B applied to gig G
WHEN user B sends PATCH /gigs/G/applications/app1
THEN the API responds with 403 Forbidden
```

### S-AUTHZ-9: Public collection visible to others

```
GIVEN user A has a collection with visibility PUBLIC
WHEN user B sends GET /collections/:id
THEN the response contains the collection and its items
```

### S-AUTHZ-10: Private collection hidden from others

```
GIVEN user A has a collection with visibility PRIVATE
WHEN user B sends GET /collections/:id
THEN the API responds with 404 Not Found
```
