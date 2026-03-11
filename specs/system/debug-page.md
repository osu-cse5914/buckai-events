# Debug Page

**Status**: Active
**Test cases**: [`/test-cases/system/debug-page.md`](../../test-cases/system/debug-page.md)

## Overview

A developer-facing debug page accessible via a "Debug" tab in the header navigation. It provides quick access to internal debugging tools without manually typing URLs.

## Scenarios

### S-DBG-1: Debug navigation link

**Given** a user is authenticated
**When** the header navigation renders
**Then** a "Debug" link appears alongside Events and Profile

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
