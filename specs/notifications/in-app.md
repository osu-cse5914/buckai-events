# In-App Notifications

## Overview

The notification system delivers in-app notifications to users about events relevant to them: application status changes, new applications on their gigs, and event reminders.

## Notification Types

| Type | Recipient | Trigger |
|------|-----------|---------|
| APPLICATION_RECEIVED | Gig owner | A user applies to their gig |
| APPLICATION_ACCEPTED | Applicant | Gig owner accepts their application |
| APPLICATION_REJECTED | Applicant | Gig owner rejects their application |
| GIG_COMPLETED | Accepted applicants | Gig moves to COMPLETED status |
| EVENT_REMINDER | User with saved event | Event starts within a configurable window (default 24 hours) |
| NEW_FOLLOWER | Followed user | A user follows them |

## Behaviors

### Notification Creation

Notifications are created by the system in response to specific events (not by users directly). Each notification has a `referenceId` and `referenceType` linking to the entity that triggered it.

### Notification Read

- `GET /notifications` returns the authenticated user's notifications, ordered by createdAt descending. Supports pagination and an `unread` filter.
- `GET /notifications/unread-count` returns the count of unread notifications.

### Mark as Read

- `PATCH /notifications/:id` with `{ read: true }` marks a single notification as read.
- `POST /notifications/mark-all-read` marks all of the user's notifications as read.

### Event Reminder Trigger

A scheduled Cloudflare Worker cron trigger runs every hour. It queries events starting within the next 24 hours that have not yet triggered a reminder. For each such event, it creates an EVENT_REMINDER notification for every user who has that event in a collection. Each event triggers at most one reminder per user (tracked to prevent duplicates).

### Notification Delivery

Notifications are stored in the database. The frontend polls `GET /notifications/unread-count` every 60 seconds to check for new notifications. There is no real-time push (no WebSocket).

## Scenarios

### S-NOTIF-1: Application received notification

```
GIVEN user B applies to gig G owned by user A
THEN user A receives a notification with type APPLICATION_RECEIVED
AND referenceId = the application ID
AND referenceType = "application"
```

### S-NOTIF-2: Application accepted notification

```
GIVEN user A accepts user B's application to gig G
THEN user B receives a notification with type APPLICATION_ACCEPTED
AND referenceId = the application ID
```

### S-NOTIF-3: Application rejected notification

```
GIVEN user A rejects user B's application to gig G
THEN user B receives a notification with type APPLICATION_REJECTED
```

### S-NOTIF-4: List notifications

```
GIVEN user A has 10 notifications (3 unread)
WHEN user A sends GET /notifications
THEN the response contains 10 notifications ordered by createdAt descending
```

### S-NOTIF-5: Filter unread notifications

```
GIVEN user A has 10 notifications (3 unread)
WHEN user A sends GET /notifications?unread=true
THEN the response contains 3 unread notifications
```

### S-NOTIF-6: Unread count

```
GIVEN user A has 3 unread notifications
WHEN user A sends GET /notifications/unread-count
THEN the response is { count: 3 }
```

### S-NOTIF-7: Mark single notification as read

```
GIVEN user A has unread notification N
WHEN user A sends PATCH /notifications/N with { read: true }
THEN notification N's read field is true
```

### S-NOTIF-8: Mark all as read

```
GIVEN user A has 5 unread notifications
WHEN user A sends POST /notifications/mark-all-read
THEN all 5 notifications have read = true
```

### S-NOTIF-9: Gig completed notification

```
GIVEN gig G moves to COMPLETED status
AND user B and user C have accepted applications on gig G
THEN user B receives a notification with type GIG_COMPLETED
AND user C receives a notification with type GIG_COMPLETED
```

### S-NOTIF-10: Cannot read another user's notifications

```
GIVEN user A has notification N
WHEN user B sends PATCH /notifications/N with { read: true }
THEN the API responds with 404 Not Found
```

### S-NOTIF-11: Event reminder notification

```
GIVEN user A has event E (startAt in 12 hours) in a collection
WHEN the reminder cron runs
THEN user A receives a notification with type EVENT_REMINDER
AND referenceId = event E's id
AND referenceType = EVENT
```

### S-NOTIF-12: Event reminder not duplicated

```
GIVEN user A already received an EVENT_REMINDER for event E
WHEN the reminder cron runs again
THEN no duplicate notification is created
```

### S-NOTIF-13: Gig completed does not notify rejected applicants

```
GIVEN gig G moves to COMPLETED status
AND user B has a REJECTED application and user C has a PENDING application
THEN user B does not receive a GIG_COMPLETED notification
AND user C does not receive a GIG_COMPLETED notification
```

### S-NOTIF-14: New follower notification

```
GIVEN user A follows user B
THEN user B receives a notification with type NEW_FOLLOWER
AND referenceId = user A's id
AND referenceType = USER
```
