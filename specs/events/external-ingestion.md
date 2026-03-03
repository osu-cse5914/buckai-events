# External Event Ingestion

## Overview

On-campus and off-campus events are pulled from external sources on a schedule and normalized into the Event table. External events are indistinguishable from user-created events in terms of user interactions — users can view, save, click, and bookmark them. The only difference is that external events cannot be created, updated, or deleted by users.

## Sources

| Source | Feed | Data |
|--------|------|------|
| OSU Events Feed | On-campus | Club events, talks, socials, university events |
| Ticketmaster API | Off-campus | Columbus-area concerts, shows, sports |

## Sync Behavior

Both sources are synced via scheduled Cloudflare Worker cron triggers, running every 6 hours.

### Upsert Logic

Events are upserted using `externalId` as the dedup key. If an event with the same `externalId` exists, its fields are updated. If not, a new event is created.

### Field Mapping

External events are normalized to the Event schema:

- `source` is set to `OSU_API` or `TICKETMASTER`.
- `creatorId` is null.
- `type` is `EVENT` (external sources do not produce gigs).
- `externalId` is set to the source's unique identifier.
- `ticketUrl` is populated for Ticketmaster events.

### AI Enrichment

After ingestion, the system runs AI tagging on newly created external events to generate `tags`, `category`, and `summary`. On update (existing event with changed fields), tags are not regenerated — the original AI-generated tags are preserved. If AI tagging fails during initial ingestion, the event is still created with `tags = []`, `summary = null`, `category = null`.

### Disappeared Events

If an external event disappears from the feed and its `endAt` has passed, it is marked COMPLETED. If an external event disappears but `endAt` is in the future (or null), no status change is made — the event remains in its current state. Events are never auto-deleted by ingestion.

## Scenarios

### S-ING-1: New OSU event ingested

```
GIVEN the OSU Events Feed contains event with externalId "osu_12345"
AND no Event exists with externalId "osu_12345"
WHEN the ingestion cron runs
THEN a new Event is created with source OSU_API, externalId "osu_12345", creatorId null
AND AI tagging generates tags and category
```

### S-ING-2: Existing event updated

```
GIVEN an Event exists with externalId "osu_12345" and title "Old Title"
AND the OSU Events Feed now has title "New Title" for externalId "osu_12345"
WHEN the ingestion cron runs
THEN the Event's title is updated to "New Title"
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
GIVEN an Event exists with externalId "osu_old" and source OSU_API
AND the OSU Events Feed no longer contains "osu_old"
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
GIVEN an Event exists with externalId "osu_future" and endAt in the future
AND the OSU Events Feed no longer contains "osu_future"
WHEN the ingestion cron runs
THEN the event's status is unchanged
```
