# Event Lifecycle Test Cases

Spec: [`lifecycle`](../../specs/events/lifecycle.md)

---

## TC-EVT-001: Create an event

- **Spec scenario**: S-EVT-1
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /events` with valid event data
- **Then**: An Event is created with status OPEN, source USER, creatorId = user A

## TC-EVT-002: Create a gig

- **Spec scenario**: S-EVT-2
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /events` with type GIG and compensation data
- **Then**: An Event is created with type GIG, status OPEN, and compensation fields set

## TC-EVT-003: Read single event

- **Spec scenario**: S-EVT-3
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Event E exists
- **When**: Any authenticated user sends `GET /events/E`
- **Then**: The response contains full event details

## TC-EVT-004: List events with filters

- **Spec scenario**: S-EVT-4
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Events exist with various types, categories, and dates
- **When**: A user sends `GET /events?type=EVENT&category=music&startDate=2025-04-01`
- **Then**: The response contains only events matching all filters, paginated

## TC-EVT-005: Update own event

- **Spec scenario**: S-EVT-5
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E with title `"Hackathon"`
- **When**: User A sends `PATCH /events/E` with `{ title: "Mega Hackathon" }`
- **Then**: Event E's title is `"Mega Hackathon"`

## TC-EVT-006: Delete own event

- **Spec scenario**: S-EVT-6
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E
- **When**: User A sends `DELETE /events/E`
- **Then**: Event E is removed from the system

## TC-EVT-007: Cannot modify external event

- **Spec scenario**: S-EVT-7
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Event E has source `OSU_API`
- **When**: Any user sends `PATCH /events/E` or `DELETE /events/E`
- **Then**: The API responds with 403 Forbidden

## TC-EVT-008: Cancel an event

- **Spec scenario**: S-EVT-8
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E with status OPEN
- **When**: User A sends `PATCH /events/E` with `{ status: "CANCELLED" }`
- **Then**: Event E's status is CANCELLED

## TC-EVT-009: Manual completion

- **Spec scenario**: S-EVT-9
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E with status IN_PROGRESS
- **When**: User A sends `PATCH /events/E` with `{ status: "COMPLETED" }`
- **Then**: Event E's status is COMPLETED

## TC-EVT-010: Auto-completion after endAt

- **Spec scenario**: S-EVT-10
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Event E has status OPEN and endAt in the past
- **When**: The auto-completion cron runs
- **Then**: Event E's status is set to COMPLETED

## TC-EVT-011: No auto-completion without endAt

- **Spec scenario**: S-EVT-11
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Event E has status OPEN and endAt is null
- **When**: The auto-completion cron runs
- **Then**: Event E's status remains OPEN

## TC-EVT-012: AI auto-tagging on creation

- **Spec scenario**: S-EVT-12
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A creates an event with title and description
- **When**: The event is saved
- **Then**: The system generates tags, category, and summary

## TC-EVT-013: AI tagging failure does not block creation

- **Spec scenario**: S-EVT-13
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The AI service is unavailable
- **When**: User A creates an event
- **Then**: The event is created with tags = [], summary = null, category = null; API responds with 201

## TC-EVT-014: Delete event cascades

- **Spec scenario**: S-EVT-14
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Phase 2+
- **Given**: User A created event E with applications, interactions, and collection items
- **When**: User A sends `DELETE /events/E`
- **Then**: Event E and all related records are deleted

## TC-EVT-015: Filter events by source

- **Spec scenario**: S-EVT-15
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Events exist from sources USER, OSU_API, and TICKETMASTER
- **When**: A user sends `GET /events?source=TICKETMASTER`
- **Then**: The response contains only TICKETMASTER events

## TC-EVT-016: Update gig after applications exist

- **Spec scenario**: S-EVT-16
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Phase 2+
- **Given**: User A created gig G with 2 pending applications
- **When**: User A updates compensation amount
- **Then**: Compensation is updated; existing applications are not affected

## TC-EVT-017: Event creation form — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 1
- **Regression**: Always
- **Steps**:
  1. Sign in, navigate to event creation page
  2. Fill in title, description, type, location, dates
  3. For GIG type, fill in compensation
  4. Submit the form
- **Expected**: Event is created and appears in the event list

## TC-EVT-018: Event list pagination — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 1
- **Regression**: Always
- **Steps**:
  1. Ensure 25+ events exist in the system
  2. Navigate to the event list page
  3. Scroll or click to load the next page
  4. Use browser back button
- **Expected**: Pagination works correctly; back button returns to the previous page state

## TC-EVT-019: Event detail page — creator actions — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 1
- **Regression**: Always
- **Steps**:
  1. Sign in as the event creator
  2. Navigate to the event detail page
  3. Verify edit, delete, and status change controls are visible
  4. Verify these controls are NOT visible when viewing as a non-creator
- **Expected**: Creator-only actions are shown only to the creator

## TC-EVT-020: Invalid status transition rejected

- **Spec scenario**: —
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Event E has status COMPLETED
- **When**: User A sends `PATCH /events/E` with `{ status: "OPEN" }`
- **Then**: The API responds with 400 Bad Request

## TC-EVT-021: Invalid create payload rejected

- **Spec scenario**: S-EVT-1, S-EVT-2
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /events` with an invalid date field or invalid `compensation.type`
- **Then**: The API responds with 400 Bad Request and no Event is created

## TC-EVT-022: Invalid update payload rejected

- **Spec scenario**: S-EVT-5, S-EVT-16
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A created event E
- **When**: User A sends `PATCH /events/E` with an invalid date field or invalid `compensation.type`
- **Then**: The API responds with 400 Bad Request and event E is not updated

## TC-EVT-023: Invalid list filters rejected

- **Spec scenario**: S-EVT-4, S-EVT-15
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: Events exist in the system
- **When**: A user sends `GET /events` with an invalid enum filter or invalid date filter
- **Then**: The API responds with 400 Bad Request and does not execute the query
