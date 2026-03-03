# Data Model

## Conventions

- All timestamps are stored and returned in UTC (ISO 8601 format).
- All string IDs are cuid format.
- Deletion is **hard delete** unless otherwise noted. Cascade rules are specified per foreign key.

## Entity-Relationship Overview

```
User ──< Event              (creator)
User ──< Application        (applicant)
Event ──< Application       (gig applications)
User ──< Collection ──< CollectionItem ──> Event
User ──< Interaction ──> Event
User ──< Conversation ──< Message
User ──< Notification
User ──< Follow ──> User    (follower → followee)
Event ──< EventEmbedding    (1:1, vector search)
```

## Entities

### User

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| clerkId | String | unique | Clerk external ID |
| email | String | unique | Must be `@osu.edu` or `@buckeyemail.osu.edu` |
| displayName | String? | max 100 chars | |
| major | String? | max 100 chars | Free-text, not validated against a list |
| gradYear | Int? | min 2000, max 2100 | Expected graduation year |
| interests | String[] | | Values from the predefined `Category` vocabulary (see below) |
| followerCount | Int | default 0 | Denormalized; incremented/decremented on Follow create/delete |
| followingCount | Int | default 0 | Denormalized; incremented/decremented on Follow create/delete |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | auto | |

### Event

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| title | String | required, max 200 chars | |
| description | String | required, max 5000 chars | |
| summary | String? | max 500 chars | AI-generated short summary. Null if AI unavailable |
| type | EventType | enum | `EVENT` or `GIG` |
| source | EventSource | enum | `OSU_API`, `TICKETMASTER`, or `USER` |
| externalId | String? | unique | Dedup key for external events |
| category | String? | | From `Category` vocabulary. AI-tagged or user-selected |
| tags | String[] | max 20 items, each max 50 chars | AI-generated or manual. Empty array if AI unavailable |
| imageUrl | String? | valid URL | |
| ticketUrl | String? | valid URL | |
| location | Location | required, embedded | See Location value object below |
| startAt | DateTime | required | UTC |
| endAt | DateTime? | must be after startAt if present | UTC |
| compensation | Compensation? | embedded | Gigs only. See Compensation value object below |
| status | EventStatus | enum, default `OPEN` | |
| creatorId | String? | FK → User, ON DELETE SET NULL | Null for external events. Set null if creator account is deleted |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | auto | |

### Application

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| gigId | String | FK → Event, ON DELETE CASCADE | Must reference an Event with type `GIG` |
| applicantId | String | FK → User, ON DELETE CASCADE | |
| message | String? | max 1000 chars | Short cover note |
| status | AppStatus | enum, default `PENDING` | |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | auto | |

**Unique constraint**: `(gigId, applicantId)` — a user can apply to a gig only once.

### Collection

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| userId | String | FK → User, ON DELETE CASCADE | Owner |
| name | String | required, max 100 chars | |
| visibility | CollectionVisibility | enum, default `PRIVATE` | `PRIVATE` or `PUBLIC` |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | auto | |

### CollectionItem

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| collectionId | String | FK → Collection, ON DELETE CASCADE | |
| eventId | String | FK → Event, ON DELETE CASCADE | |
| createdAt | DateTime | default now | |

**Unique constraint**: `(collectionId, eventId)` — an event appears in a collection only once.

### Interaction

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| userId | String | FK → User, ON DELETE CASCADE | |
| eventId | String | FK → Event, ON DELETE CASCADE | |
| action | InteractionType | enum | |
| createdAt | DateTime | default now | |

### Conversation

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| userId | String | FK → User, ON DELETE CASCADE | |
| title | String? | max 200 chars | Auto-generated from first message. Null if AI unavailable |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | auto | |

### Message

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| conversationId | String | FK → Conversation, ON DELETE CASCADE | |
| role | MessageRole | enum | |
| content | String | required, max 10000 chars | |
| createdAt | DateTime | default now | |

### Notification

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| userId | String | FK → User, ON DELETE CASCADE | Recipient |
| type | NotificationType | enum | |
| title | String | required, max 200 chars | |
| body | String | required, max 1000 chars | |
| referenceId | String? | | ID of related entity |
| referenceType | ReferenceType? | enum | Type of related entity |
| read | Boolean | default false | |
| createdAt | DateTime | default now | |

### Follow

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| followerId | String | FK → User, ON DELETE CASCADE | The user who follows |
| followeeId | String | FK → User, ON DELETE CASCADE | The user being followed |
| createdAt | DateTime | default now | |

**Unique constraint**: `(followerId, followeeId)` — a user can follow another user only once.
**Check constraint**: `followerId != followeeId` — a user cannot follow themselves.

### EventEmbedding

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| eventId | String | FK → Event, ON DELETE CASCADE, unique | One embedding per event |
| embedding | vector(768) | not null | pgvector column. Dimensions match embedding model config |
| textHash | String | not null | Hash of source text. Used to detect staleness |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | auto | |

Requires the `pgvector` PostgreSQL extension. An HNSW index is created on the `embedding` column for approximate nearest neighbor search.

## Value Objects

These are embedded objects stored as JSON columns or flattened into parent table columns. They do not have their own IDs or tables.

### Location

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| name | String | required, max 500 chars | Human-readable (e.g., "Thompson Library") |
| latitude | Float? | -90 to 90 | |
| longitude | Float? | -180 to 180 | |

### Compensation

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| amount | Float | required, min 0 | Dollar amount |
| currency | String | default "USD" | ISO 4217 currency code |
| type | CompensationType | enum | `FIXED` or `HOURLY` |

## Enums

```
EventType:            EVENT | GIG
EventSource:          OSU_API | TICKETMASTER | USER
EventStatus:          OPEN | IN_PROGRESS | COMPLETED | CANCELLED
AppStatus:            PENDING | ACCEPTED | REJECTED
InteractionType:      VIEW | SAVE | CLICK | APPLY | DISMISS
MessageRole:          USER | ASSISTANT | SYSTEM
CollectionVisibility: PRIVATE | PUBLIC
NotificationType:     APPLICATION_RECEIVED | APPLICATION_ACCEPTED | APPLICATION_REJECTED | GIG_COMPLETED | EVENT_REMINDER | NEW_FOLLOWER
ReferenceType:        EVENT | APPLICATION | USER
CompensationType:     FIXED | HOURLY
```

## Category Vocabulary

A predefined set of interest/event categories. Stored as strings. The set can be extended without a migration.

```
music | sports | tech | arts | academic | social | career | food | fitness | gaming | outdoors | volunteering | cultural | science | business | other
```

Users select interests from this list. Events are tagged with a category from this list (AI-tagged or user-selected). Interests and categories that do not match this vocabulary are accepted but ignored by the recommendation model's category affinity signal.

## Cascade Summary

| Parent Deleted | Child Behavior |
|----------------|---------------|
| User deleted | Events: creatorId set to NULL (events persist). Applications, Collections, Interactions, Conversations, Notifications, Follows: CASCADE deleted |
| Event deleted | Applications, CollectionItems, Interactions, EventEmbedding: CASCADE deleted |
| Collection deleted | CollectionItems: CASCADE deleted |
| Conversation deleted | Messages: CASCADE deleted |
