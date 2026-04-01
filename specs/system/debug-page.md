# Debug Page

**Status**: Active
**Test cases**: [`/test-cases/system/debug-page.md`](../../test-cases/system/debug-page.md)

## Overview

A developer-facing debug page accessible from a development-only entry in the
avatar menu or by direct URL. It provides quick access to internal debugging
tools without making Debug part of the primary product navigation.

The page currently exposes authenticated-user context, an API health probe, a
profile-viewer shortcut, and admin-only operational controls for external sync
and AI pipeline jobs.

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
- A current-user section showing the authenticated request context
- A "View API Health" button that calls `GET /api/health`
- A control to view a user profile by ID (navigates to `/users/:id`)
- An environment information section

### S-DBG-3: API Health check

**Given** the debug page is rendered
**When** the user clicks "View API Health"
**Then** the result of the health check is displayed (service, status, timestamp)

### S-DBG-4: User profile viewer

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

### S-DBG-10: Admin sees AI pipeline controls

**Given** the authenticated user has role `ADMIN`
**When** the debug page renders
**Then** the page displays controls to refresh recent AI pipeline jobs
**And** the page displays controls to rerun the pipeline for an event
**And** the page displays a control to backfill missing embeddings

### S-DBG-11: Admin can queue an AI pipeline rerun

**Given** the authenticated user has role `ADMIN`
**And** the debug page is rendered
**When** the user enters an event ID and triggers "Rerun Full Pipeline"
**Then** the page calls the AI pipeline rerun endpoint for that event

### S-DBG-12: Admin can trigger embedding backfill

**Given** the authenticated user has role `ADMIN`
**And** the debug page is rendered
**When** the user triggers "Backfill Missing Embeddings"
**Then** the page calls the embedding backfill endpoint

### S-DBG-13: Non-admin cannot list AI pipeline jobs

**Given** the authenticated user has role `USER`
**When** the client requests `GET /api/v1/admin/ai-pipeline/jobs`
**Then** the API responds with 403 Forbidden

### S-DBG-14: Admin can list recent AI pipeline jobs

**Given** the authenticated user has role `ADMIN`
**When** the client requests `GET /api/v1/admin/ai-pipeline/jobs`
**Then** the API responds with the most recent AI pipeline jobs

### S-DBG-15: Admin can create an event rerun job

**Given** the authenticated user has role `ADMIN`
**When** the client sends `POST /api/v1/admin/ai-pipeline/events/:id/rerun`
**Then** the API enqueues an AI pipeline job for that event and responds with 202

### S-DBG-16: Admin can create an embedding backfill job

**Given** the authenticated user has role `ADMIN`
**When** the client sends `POST /api/v1/admin/ai-pipeline/backfill`
**Then** the API enqueues an embedding backfill job and responds with 202
