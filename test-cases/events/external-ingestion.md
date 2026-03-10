# External Event Ingestion Test Cases

Spec: [`external-ingestion`](../../specs/events/external-ingestion.md)

---

## TC-ING-001: New OSU event ingested

- **Spec scenario**: S-ING-1
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The OSU Content API returns an event with a new externalId
- **When**: The ingestion cron runs
- **Then**: A new Event is created with source OSU_API, correct field mapping, and AI tagging

## TC-ING-002: Existing event updated (hash changed)

- **Spec scenario**: S-ING-2
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: An Event exists with externalId and stored itemHash `"abc123"`; API now returns hash `"def456"`
- **When**: The ingestion cron runs
- **Then**: The Event's fields are updated and itemHash is updated to `"def456"`

## TC-ING-003: Existing event unchanged (hash match)

- **Spec scenario**: S-ING-2a
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: An Event exists with stored itemHash matching the API response hash
- **When**: The ingestion cron runs
- **Then**: No database write is performed for this event

## TC-ING-004: Ticketmaster event ingested

- **Spec scenario**: S-ING-3
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The Ticketmaster API returns an event with a new id
- **When**: The ingestion cron runs
- **Then**: A new Event is created with source TICKETMASTER and ticketUrl populated

## TC-ING-005: Stale external event completed

- **Spec scenario**: S-ING-4
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: An external event exists but no longer appears in the API feed, and endAt has passed
- **When**: The ingestion cron runs
- **Then**: The event's status is set to COMPLETED

## TC-ING-006: Dedup prevents duplicates

- **Spec scenario**: S-ING-5
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: An Event exists with a given externalId
- **When**: The ingestion cron encounters the same externalId again
- **Then**: No new Event is created; existing one is updated if changed

## TC-ING-007: AI tagging failure does not block ingestion

- **Spec scenario**: S-ING-6
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The AI service is unavailable
- **When**: The ingestion cron creates a new external event
- **Then**: Event is created with tags = [], summary = null, category = null

## TC-ING-008: Updated event preserves original tags

- **Spec scenario**: S-ING-7
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Event E was ingested with AI-generated tags
- **When**: The external feed has a new description for event E
- **Then**: Description is updated but tags are preserved

## TC-ING-009: Disappeared event with future endAt unchanged

- **Spec scenario**: S-ING-8
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: An external event exists with future endAt, no longer in the API feed
- **When**: The ingestion cron runs
- **Then**: The event's status is unchanged

## TC-ING-010: Only Columbus campus events ingested

- **Spec scenario**: S-ING-9
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The OSU Content API returns events with campus `"columbus"` and `"lima"`
- **When**: The ingestion cron runs
- **Then**: Only `"columbus"` events are ingested

## TC-ING-011: External events visible in event list — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Steps**:
  1. Trigger an ingestion sync (or wait for cron)
  2. Navigate to the event list page
  3. Filter by source (OSU_API or TICKETMASTER)
- **Expected**: External events appear in the list with correct data; no edit/delete controls are shown
