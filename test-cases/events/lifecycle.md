# Event Lifecycle Test Cases

Spec: [`lifecycle`](../../specs/events/lifecycle.md)

---

## TC-EVT-001: Create an event

- **Spec scenario**: S-EVT-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /events` with valid event data
- **Then**: An Event is created with status OPEN, source USER, creatorId = user A

## TC-EVT-002: Create a gig

- **Spec scenario**: S-EVT-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /events` with type GIG and compensation data
- **Then**: An Event is created with type GIG, status OPEN, and compensation fields set

## TC-EVT-003: Read single event

- **Spec scenario**: S-EVT-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Event E exists
- **When**: Any authenticated user sends `GET /events/E`
- **Then**: The response contains full event details

## TC-EVT-004: List events with filters

- **Spec scenario**: S-EVT-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Events exist with various types, categories, and dates
- **When**: A user sends `GET /events?type=EVENT&category=music&startDate=2025-04-01`
- **Then**: The response contains only events matching all filters, paginated

## TC-EVT-005: Update own event

- **Spec scenario**: S-EVT-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E with title `"Hackathon"`
- **When**: User A sends `PATCH /events/E` with `{ title: "Mega Hackathon" }`
- **Then**: Event E's title is `"Mega Hackathon"`

## TC-EVT-006: Delete own event

- **Spec scenario**: S-EVT-6
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E
- **When**: User A sends `DELETE /events/E`
- **Then**: Event E is removed from the system

## TC-EVT-007: Cannot modify external event

- **Spec scenario**: S-EVT-7
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Event E has source `OSU_API`
- **When**: Any user sends `PATCH /events/E` or `DELETE /events/E`
- **Then**: The API responds with 403 Forbidden

## TC-EVT-008: Cancel an event

- **Spec scenario**: S-EVT-8
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E with status OPEN
- **When**: User A sends `PATCH /events/E` with `{ status: "CANCELLED" }`
- **Then**: Event E's status is CANCELLED

## TC-EVT-009: Manual completion

- **Spec scenario**: S-EVT-9
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E with status IN_PROGRESS
- **When**: User A sends `PATCH /events/E` with `{ status: "COMPLETED" }`
- **Then**: Event E's status is COMPLETED

## TC-EVT-010: Auto-completion after endAt

- **Spec scenario**: S-EVT-10
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/runtime/runtime.test.ts`, `apps/backend/src/test/scheduled.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Event E has status OPEN and endAt in the past
- **When**: The auto-completion cron runs
- **Then**: Event E's status is set to COMPLETED

## TC-EVT-011: No auto-completion without endAt

- **Spec scenario**: S-EVT-11
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/scheduled.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Event E has status OPEN and endAt is null
- **When**: The auto-completion cron runs
- **Then**: Event E's status remains OPEN

## TC-EVT-012: AI auto-tagging on creation

- **Spec scenario**: S-EVT-12
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events-ai-tagging.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A creates an event with title and description
- **When**: The event is saved
- **Then**: The system generates tags, category, and summary

## TC-EVT-013: AI tagging failure does not block creation

- **Spec scenario**: S-EVT-13
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events-ai-tagging.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The AI service is unavailable
- **When**: User A creates an event
- **Then**: The event is created with tags = [], summary = null, category = null; API responds with 201

## TC-EVT-014: Delete event cascades

- **Spec scenario**: S-EVT-14
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 2
- **Regression**: Phase 2+
- **Given**: User A created event E with applications, interactions, and collection items
- **When**: User A sends `DELETE /events/E`
- **Then**: Event E and all related records are deleted

## TC-EVT-015: Filter events by source

- **Spec scenario**: S-EVT-15
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Events exist from sources USER, OSU_API, and TICKETMASTER
- **When**: A user sends `GET /events?source=TICKETMASTER`
- **Then**: The response contains only TICKETMASTER events

## TC-EVT-016: Update gig after applications exist

- **Spec scenario**: S-EVT-16
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 2
- **Regression**: Phase 2+
- **Given**: User A created gig G with 2 pending applications
- **When**: User A updates compensation amount
- **Then**: Compensation is updated; existing applications are not affected

## TC-EVT-017: Event creation form — UI

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/-new.test.tsx`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: The authenticated user is on the event creation page
- **When**: They enter valid event details and submit the form
- **Then**: The event create request is posted and the user is navigated to the new event detail page

## TC-EVT-018: Event browse progressive loading and history restoration — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 1
- **Regression**: Final only
- **Steps**:
  1. Ensure 25+ events exist in the system
  2. Navigate to the event list page
  3. Scroll to load more results and open an event detail
  4. Return to the browse surface
- **Expected**: Progressive loading works and the prior browse context is restored on return

## TC-EVT-019: Event detail page — creator actions — UI

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-edit.test.tsx`, `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: A user opens an event detail or edit surface
- **When**: The viewer is the creator or a non-creator
- **Then**: Creator-only edit, delete, and status controls are shown only to the creator

## TC-EVT-020: Invalid status transition rejected

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Event E has status COMPLETED
- **When**: User A sends `PATCH /events/E` with `{ status: "OPEN" }`
- **Then**: The API responds with 400 Bad Request

## TC-EVT-021: Invalid create payload rejected

- **Spec scenario**: S-EVT-1, S-EVT-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /events` with an invalid date field or invalid `compensation.type`
- **Then**: The API responds with 400 Bad Request and no Event is created

## TC-EVT-022: Invalid update payload rejected

- **Spec scenario**: S-EVT-5, S-EVT-16
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E
- **When**: User A sends `PATCH /events/E` with an invalid date field or invalid `compensation.type`
- **Then**: The API responds with 400 Bad Request and event E is not updated

## TC-EVT-023: Invalid list filters rejected

- **Spec scenario**: S-EVT-4, S-EVT-15
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Events exist in the system
- **When**: A user sends `GET /events` with an invalid enum filter or invalid date filter
- **Then**: The API responds with 400 Bad Request and does not execute the query

## TC-EVT-024: Events browse split view selection on desktop

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The desktop events browse page renders multiple results
- **When**: The user selects an event from the left-side list
- **Then**: The event detail pane renders the selected event without leaving the browse page

## TC-EVT-025: Gigs browse split view selection on desktop

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/gigs/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The desktop gigs browse page renders multiple results
- **When**: The user selects a gig from the left-side list
- **Then**: The gig detail pane renders the selected gig without leaving the browse page

## TC-EVT-026: Events browse loads more results on scroll

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The events browse page has more results than the first loaded batch
- **When**: The user scrolls the list until the load-more sentinel enters view
- **Then**: The next batch loads into the same list without rendering pagination controls

## TC-EVT-027: Event description markdown renders in detail view

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/components/ui/markdown-content.test.tsx`, `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: An event description includes Markdown formatting, including imported content with malformed emphasis spacing
- **When**: A user opens the event detail view
- **Then**: The description renders Markdown structure such as headings, lists, links, emphasis, and line breaks without exposing raw Markdown markers

## TC-EVT-028: Events browse deduplicates overlapping infinite-scroll batches

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: Two loaded browse batches contain the same event ID
- **When**: The user scrolls to load the next batch
- **Then**: The browse list renders that event only once and still shows the new unique results

## TC-EVT-029: Create form fixes listing type from route context

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/-new.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A user opens the shared create form from the Gigs browse page
- **When**: The form renders
- **Then**: The type selector is not shown and the form remains fixed to gig creation fields and actions

## TC-EVT-030: Event list supports grouped active filtering and configurable sort

- **Spec scenario**: S-EVT-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/events.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: Events exist across OPEN, IN_PROGRESS, COMPLETED, and CANCELLED statuses, including stale OPEN rows whose `endAt` is past or whose `startAt` is past with no `endAt`, with different start times
- **When**: A user sends `GET /events?statusMode=ACTIVE&sort=START_DESC`
- **Then**: The response filters to OPEN and IN_PROGRESS events that are still upcoming or currently in progress and orders them by latest start time first

## TC-EVT-031: Events browse defaults to active status and soonest-first ordering

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A user opens `/events` without explicit browse filters
- **When**: The route loader primes the initial browse batch
- **Then**: The browse query uses `statusMode=ACTIVE` and `sort=START_ASC`

## TC-EVT-032: Gigs browse defaults to open status and soonest-first ordering

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/gigs/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A user opens `/gigs` without explicit browse filters
- **When**: The route loader primes the initial browse batch
- **Then**: The browse query uses `statusMode=OPEN` and `sort=START_ASC`

## TC-EVT-033: Browse results show external source labels

- **Spec scenario**: S-EVT-4
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/-index.test.tsx`, `apps/web/src/routes/_authenticated/gigs/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: Browse results include external events from OSU or Ticketmaster
- **When**: A user views the shared browse list
- **Then**: Each external result shows its source label instead of `Unknown`

## TC-EVT-034: Browse results fall back to creator email

- **Spec scenario**: S-EVT-4
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/-index.test.tsx`, `apps/web/src/routes/_authenticated/gigs/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A user-created event or gig has a null creator display name but a creator email
- **When**: A user views the shared browse list
- **Then**: The result shows the creator email instead of `Unknown`

## TC-EVT-035: Events query hook exposes a loading state before the first response

- **Spec scenario**: S-EVT-4
- **Type**: Automated
- **Automated in**: `apps/web/src/components/events/events-browser.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The events endpoint has not returned the first browse batch yet
- **When**: The shared events query hook is subscribed
- **Then**: The hook reports a loading state until the first response resolves

## TC-EVT-036: Events query hook requests filtered browse data

- **Spec scenario**: S-EVT-4
- **Type**: Automated
- **Automated in**: `apps/web/src/components/events/events-browser.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A browse surface requests a specific page of filtered events
- **When**: The shared events query hook runs
- **Then**: It requests the matching `/api/v1/events` page and returns the API data

## TC-EVT-037: Events query hook surfaces browse fetch failures

- **Spec scenario**: S-EVT-4
- **Type**: Automated
- **Automated in**: `apps/web/src/components/events/events-browser.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The events endpoint returns a non-success response for a browse request
- **When**: The shared events query hook runs
- **Then**: It exposes a fetch failure that the page can render as an error state

## TC-EVT-038: Event detail falls back when Ticketmaster description is blank

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A Ticketmaster event detail has an empty `description`
- **When**: A user opens the event detail page
- **Then**: The Description section shows fallback copy with a Ticketmaster link instead of rendering blank content

## TC-EVT-039: Event detail appends a Ticketmaster link to populated descriptions

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A Ticketmaster event detail has a populated `description` and a `ticketUrl`
- **When**: A user opens the event detail page
- **Then**: The Description section keeps the event description and also includes a Ticketmaster link

## TC-EVT-040: Event detail normalizes displayed hashtag-prefixed tags

- **Spec scenario**: S-EVT-12
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: An event detail includes stored tags like `#coding` and `##music`
- **When**: A user opens the event detail page
- **Then**: The tag badges display normalized labels without leading `#`

## TC-EVT-041: Event detail shows related events below tags

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The current event has related vector matches available
- **When**: A user opens the event detail page
- **Then**: The page shows a related-events section below Tags with links to those events

## TC-EVT-042: Event detail back link returns to the previous related event

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A user opens an event from another event's related-items section
- **When**: The destination event detail page renders
- **Then**: The Back link targets the previous event while preserving the prior fallback context

## TC-EVT-043: Event detail back link restores selected browse context

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A user opens an event from a selected item in the browse panel
- **When**: The destination event detail page renders
- **Then**: The Back link targets the browse page with the preserved selected listing and filters

## TC-EVT-044: Related event links preserve selected browse context

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A user is viewing an event in the browse preview panel with an item selected
- **When**: They open a related event from that panel
- **Then**: The related-event link carries the browse selection and filters so Back returns to the selected listing
