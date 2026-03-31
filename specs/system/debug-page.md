# Debug Page

**Status**: Active
**Test cases**: [`/test-cases/system/debug-page.md`](../../test-cases/system/debug-page.md)

## Overview

A developer-facing debug page accessible from a development-only entry in the avatar menu or by direct URL. It provides quick access to internal debugging tools without making Debug part of the primary product navigation.

## Scenarios

### S-DBG-1: Debug navigation link

**Given** a user is authenticated
**When** the primary navigation renders
**Then** "Debug" does not appear alongside the product destinations
**And** the page remains available through development-only access

### S-DBG-2: Debug page displays debug tools

**Given** a user navigates to `/debug`
**When** the debug page renders
**Then** the page displays:
- A heading indicating it is a debug/developer page
- A "View API Health" button that calls `GET /api/health`
- A "Check DB Connection" button that calls `GET /api/db-check`
- A link to view a user profile by ID (navigates to `/users/:id`)

### S-DBG-3: API Health check

**Given** the debug page is rendered
**When** the user clicks "View API Health"
**Then** the result of the health check is displayed (service, status, timestamp)

### S-DBG-4: DB Connection check

**Given** the debug page is rendered
**When** the user clicks "Check DB Connection"
**Then** the database connection status is displayed

### S-DBG-5: User profile viewer

**Given** the debug page is rendered
**When** the user enters a user ID and clicks the view button
**Then** the app navigates to `/users/:id`

### S-DBG-6: Admin sees external sync control

**Given** the authenticated user has role `ADMIN`
**When** the debug page renders
**Then** the page displays a "Sync External Events" control

### S-DBG-7: Non-admin does not see external sync control

**Given** the authenticated user has role `USER`
**When** the debug page renders
**Then** the page does not display a "Sync External Events" control

### S-DBG-8: External sync success result

**Given** the authenticated user has role `ADMIN`
**And** the debug page is rendered
**When** the user triggers "Sync External Events"
**Then** the page shows a loading state while the request is pending
**And** on success it displays the returned per-source counters

### S-DBG-9: External sync failure result

**Given** the authenticated user has role `ADMIN`
**And** the debug page is rendered
**When** the user triggers "Sync External Events" and the request fails
**Then** the page shows an error message
