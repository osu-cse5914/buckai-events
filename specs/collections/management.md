# Collections

## Overview

Users save events to named collections (bookmarks). Each collection has a configurable visibility: PRIVATE (default) or PUBLIC. Public collections are accessible by other users via a direct link. Users can create multiple collections and add any event (including external events) to them.

## Behaviors

### Collection CRUD

- **Create**: Any authenticated user can create a collection with a name and optional visibility setting.
- **Read**: Owner always has access. Other users can access PUBLIC collections. Accessing a PRIVATE collection owned by someone else returns 404.
- **Update**: Owner can rename the collection or change its visibility.
- **Delete**: Owner can delete a collection. Deleting a collection removes all its CollectionItems.

### Adding / Removing Events

- Users add events to their own collections. Adding an event that is already in the collection returns 409 Conflict.
- Users remove events from their own collections.
- Adding an event to a collection creates an Interaction with action `SAVE`.

### Listing

- `GET /collections` returns the authenticated user's collections ordered by `updatedAt` descending, including each collection's item count.
- `GET /collections/:id` returns a single collection with its items (events).
- `GET /collections/:id/items` returns the events in a collection, paginated.

## Scenarios

### S-COL-1: Create a collection

```
GIVEN user A is authenticated
WHEN user A sends POST /collections with { name: "Music Events" }
THEN a Collection is created with visibility PRIVATE, userId = user A
```

### S-COL-2: Create a public collection

```
GIVEN user A is authenticated
WHEN user A sends POST /collections with { name: "Must See", visibility: "PUBLIC" }
THEN a Collection is created with visibility PUBLIC
```

### S-COL-3: Add event to collection

```
GIVEN user A owns collection C
AND event E exists
WHEN user A sends POST /collections/C/items with { eventId: E }
THEN a CollectionItem is created linking collection C to event E
AND an Interaction with action SAVE is created for user A on event E
```

### S-COL-4: Cannot add duplicate event

```
GIVEN collection C already contains event E
WHEN user A sends POST /collections/C/items with { eventId: E }
THEN the API responds with 409 Conflict
```

### S-COL-5: Remove event from collection

```
GIVEN user A owns collection C
AND collection C contains event E
WHEN user A sends DELETE /collections/C/items/E
THEN the CollectionItem is removed
AND event E is not deleted from the system
```

### S-COL-6: List own collections

```
GIVEN user A has 3 collections
WHEN user A sends GET /collections
THEN the response contains user A's 3 collections ordered by updatedAt descending
AND each collection includes its item count
```

### S-COL-7: View public collection as another user

```
GIVEN user A has collection C with visibility PUBLIC
WHEN user B sends GET /collections/C
THEN the response contains collection C and its items
```

### S-COL-8: Cannot view private collection of another user

```
GIVEN user A has collection C with visibility PRIVATE
WHEN user B sends GET /collections/C
THEN the API responds with 404 Not Found
```

### S-COL-9: Change collection visibility

```
GIVEN user A has collection C with visibility PRIVATE
WHEN user A sends PATCH /collections/C with { visibility: "PUBLIC" }
THEN collection C's visibility is PUBLIC
```

### S-COL-10: Delete collection

```
GIVEN user A has collection C with 5 items
WHEN user A sends DELETE /collections/C
THEN collection C is deleted
AND all 5 CollectionItems are deleted
AND the referenced events are not affected
```

## Test Cases

See [`test-cases/collections/management.md`](../../test-cases/collections/management.md) for the full test case registry (TC-COL-001 through TC-COL-012), including automated API tests and manual UI cases for save, browse, and manage flows.
