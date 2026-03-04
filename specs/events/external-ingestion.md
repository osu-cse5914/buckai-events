# External Event Ingestion

## Overview

On-campus and off-campus events are pulled from external sources on a schedule and normalized into the Event table. External events are indistinguishable from user-created events in terms of user interactions — users can view, save, click, and bookmark them. The only difference is that external events cannot be created, updated, or deleted by users.

## Sources

| Source | Feed | Data |
|--------|------|------|
| OSU Content API | On-campus | Club events, talks, socials, university events |
| Ticketmaster API | Off-campus | Columbus-area concerts, shows, sports |

## OSU Content API Integration

The Ohio State University publishes campus events through its public Content API.

### Endpoint

```
GET https://content.osu.edu/v2/events
```

No authentication is required. The endpoint returns all current campus events in a single response.

### Response Shape

```jsonc
{
  "lastModified": "2026-03-04T00:13:01.131Z",
  "status": "success",
  "data": {
    "events": [
      {
        "id": "https://studentlife.osu.edu/Events.aspx?y=2026&mo=3&day=3&e=83306&title=group-fitness-classes",
        "itemHash": "35756176be0527e9dd7a070e26e2ff77",
        "title": "Group Fitness Classes",
        "description": "RPAC/North Rec (check schedule)",
        "content": "**Try a group fitness class...**",
        "startDate": "2026-03-03T11:45:00.000Z",
        "endDate": "2026-03-04T01:15:00.000Z",
        "location": "RPAC/North Rec (check schedule)",
        "tags": ["Sports", "Health and Wellness", "Social"],
        "link": "https://studentlife.osu.edu/Events.aspx?...",
        "label": "Student Life",
        "campus": "columbus",
        "color": "#bb0000"
      }
    ]
  }
}
```

### Field Mapping (OSU → Event)

| OSU Content API field | Event field | Notes |
|-----------------------|-------------|-------|
| `id` | `externalId` | URL-format unique identifier |
| `itemHash` | — | Used for change detection during upsert |
| `title` | `title` | Direct mapping |
| `description` | `location` | OSU uses `description` for the short venue string |
| `content` | `description` | Markdown body of the event |
| `startDate` | `startAt` | ISO 8601 UTC timestamp |
| `endDate` | `endAt` | ISO 8601 UTC timestamp |
| `location` | `location` | Preferred over `description` when present |
| `tags` | — | Not mapped directly; AI tagging generates our own tags |
| `link` | `externalUrl` | Link back to the original event page |
| `label` | — | Used for logging/debugging only |
| `campus` | — | Filtered to `"columbus"` campus only |

### Change Detection

On each sync, the ingestion worker compares the `itemHash` of each incoming event against the stored hash for that `externalId`. If the hash is unchanged, the event is skipped (no DB write). If the hash differs, the event is upserted with the new field values.

## Sync Behavior

Both sources are synced via scheduled Cloudflare Worker cron triggers, running every 6 hours.

### Upsert Logic

Events are upserted using `externalId` as the dedup key. If an event with the same `externalId` exists, its fields are updated. If not, a new event is created.

### Field Mapping (General)

External events are normalized to the Event schema:

- `source` is set to `OSU_API` or `TICKETMASTER`.
- `creatorId` is null.
- `type` is `EVENT` (external sources do not produce gigs).
- `externalId` is set to the source's unique identifier.
- `ticketUrl` is populated for Ticketmaster events.
- `externalUrl` is populated for OSU events (the `link` field).

### AI Enrichment

After ingestion, the system runs AI tagging on newly created external events to generate `tags`, `category`, and `summary`. On update (existing event with changed fields), tags are not regenerated — the original AI-generated tags are preserved. If AI tagging fails during initial ingestion, the event is still created with `tags = []`, `summary = null`, `category = null`.

### Disappeared Events

If an external event disappears from the feed and its `endAt` has passed, it is marked COMPLETED. If an external event disappears but `endAt` is in the future (or null), no status change is made — the event remains in its current state. Events are never auto-deleted by ingestion.

## Scenarios

### S-ING-1: New OSU event ingested

```
GIVEN the OSU Content API returns an event with id "https://studentlife.osu.edu/Events.aspx?e=83306" and itemHash "abc123"
AND no Event exists with externalId "https://studentlife.osu.edu/Events.aspx?e=83306"
WHEN the ingestion cron runs
THEN a new Event is created with source OSU_API, externalId set to the OSU id, creatorId null
AND the event's title, description, location, startAt, endAt, and externalUrl are mapped from the API response
AND AI tagging generates tags and category
```

### S-ING-2: Existing event updated (hash changed)

```
GIVEN an Event exists with externalId "https://studentlife.osu.edu/Events.aspx?e=83306" and stored itemHash "abc123"
AND the OSU Content API now returns itemHash "def456" for the same id
WHEN the ingestion cron runs
THEN the Event's fields are updated from the new API response
AND the stored itemHash is updated to "def456"
```

### S-ING-2a: Existing event unchanged (hash match)

```
GIVEN an Event exists with externalId "https://studentlife.osu.edu/Events.aspx?e=83306" and stored itemHash "abc123"
AND the OSU Content API still returns itemHash "abc123" for the same id
WHEN the ingestion cron runs
THEN no database write is performed for this event
```

### S-ING-3: Ticketmaster event ingested

```
GIVEN the Ticketmaster API returns an event with id "tm_67890"
AND no Event exists with externalId "tm_67890"
WHEN the ingestion cron runs
THEN a new Event is created with source TICKETMASTER, externalId "tm_67890"
AND ticketUrl is populated from the Ticketmaster data
```

### S-ING-4: Stale external event handling

```
GIVEN an Event exists with externalId "https://studentlife.osu.edu/Events.aspx?e=10000" and source OSU_API
AND the OSU Content API no longer returns this event
AND the event's endAt has passed
WHEN the ingestion cron runs
THEN the event's status is set to COMPLETED
```

### S-ING-5: Dedup prevents duplicates

```
GIVEN an Event exists with externalId "tm_67890"
WHEN the ingestion cron processes Ticketmaster event with id "tm_67890" again
THEN no new Event is created
AND the existing Event's fields are updated if changed
```

### S-ING-6: AI tagging failure does not block ingestion

```
GIVEN the AI service is unavailable
WHEN the ingestion cron creates a new external event
THEN the event is created with tags = [], summary = null, category = null
```

### S-ING-7: Updated event preserves original tags

```
GIVEN event E was ingested with AI-generated tags ["music", "jazz"]
AND the external feed now has a new description for event E
WHEN the ingestion cron runs
THEN event E's description is updated
AND event E's tags remain ["music", "jazz"]
```

### S-ING-8: Disappeared event with future endAt unchanged

```
GIVEN an Event exists with externalId "https://studentlife.osu.edu/Events.aspx?e=99999" and endAt in the future
AND the OSU Content API no longer returns this event
WHEN the ingestion cron runs
THEN the event's status is unchanged
```

### S-ING-9: Only Columbus campus events are ingested

```
GIVEN the OSU Content API returns events with campus "columbus" and campus "lima"
WHEN the ingestion cron runs
THEN only events with campus "columbus" are ingested
AND events with other campus values are ignored
```
