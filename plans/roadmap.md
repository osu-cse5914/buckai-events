# BuckAI Events — Project Roadmap

> Generated from `/specs`. This is the living plan for implementation.
> Each phase is ~1 sprint (1–2 weeks depending on team size).

---

## Current State

The codebase has infrastructure scaffolding only:

- Turborepo + Bun monorepo
- Hono server with health-check routes
- Prisma with a minimal User model (missing all other entities)
- React + Vite shell with TanStack Router, Tailwind, shadcn/ui
- CI/CD pipeline (GitHub Actions → Cloudflare Workers)
- Comprehensive specs (25 files) — none implemented yet

---

## Phase 0 — Foundation

**Goal**: Database schema, auth, dev tooling. Everything else depends on this.

### 0.1 Database Schema

| # | Task | Spec | Scope |
|---|------|------|-------|
| 0.1.1 | Define all enums (EventType, EventSource, EventStatus, AppStatus, InteractionType, MessageRole, CollectionVisibility, CompensationType) | `data-model` | API |
| 0.1.2 | Expand User model (clerkId, email, displayName, major, gradYear, interests, followerCount, followingCount) | `data-model` | API |
| 0.1.3 | Create Event model with embedded Location and Compensation | `data-model` | API |
| 0.1.4 | Create Application model with unique (gigId, applicantId) constraint | `data-model` | API |
| 0.1.5 | Create Follow model with unique (followerId, followeeId) + self-follow check | `data-model` | API |
| 0.1.6 | Create Collection, CollectionItem models | `data-model` | API |
| 0.1.7 | Create Interaction model (append-only) | `data-model` | API |
| 0.1.8 | Create Conversation, Message models | `data-model` | API |
| 0.1.9 | Create EventEmbedding model with pgvector vector(768) | `data-model` | API |
| 0.1.10 | Run initial migration, verify all relationships and cascades | `data-model` | API |

### 0.2 Auth

| # | Task | Spec | Scope |
|---|------|------|-------|
| 0.2.1 | Install and configure Clerk (`@clerk/react`, `@hono/clerk-auth`) | `authentication` | Full-stack |
| 0.2.2 | Add JWT verification middleware to Hono | `authentication` | API |
| 0.2.3 | Implement auto-provisioning: first auth → create User row linked to clerkId | `authentication` | API |
| 0.2.4 | Restrict sign-up to @osu.edu / @buckeyemail.osu.edu domains | `authentication` | Full-stack |
| 0.2.5 | Add Clerk `<SignIn>`, `<SignUp>`, `<UserButton>` to frontend | `authentication` | Web |

### 0.3 Dev Tooling

| # | Task | Spec | Scope |
|---|------|------|-------|
| 0.3.1 | Set up Vitest for API (unit + integration tests) | — | API |
| 0.3.2 | Set up Vitest + Testing Library for Web | — | Web |
| 0.3.3 | Add test commands to Turborepo (`bun run test`) | — | Root |
| 0.3.4 | Add API client helper or shared types package for frontend ↔ backend | — | Root |

**Depends on**: Nothing (first phase)
**Blocks**: Everything else

---

## Phase 1 — Users & Events (Core CRUD)

**Goal**: Users can manage profiles and create/browse events. The two most foundational entities.

### 1.1 User Profile API

| # | Task | Spec | Scope |
|---|------|------|-------|
| 1.1.1 | `GET /api/v1/users/me` — return authenticated user's profile | `profile` | API |
| 1.1.2 | `PATCH /api/v1/users/me` — update displayName, major, gradYear, interests | `profile` | API |
| 1.1.3 | `GET /api/v1/users/:id` — public profile (displayName, major, gradYear, interests, followerCount, followingCount, created events) | `public-profile` | API |
| 1.1.4 | Write tests for all profile scenarios | `profile`, `public-profile` | API |

### 1.2 User Profile UI

| # | Task | Spec | Scope |
|---|------|------|-------|
| 1.2.1 | Profile page — display own profile with edit form | `profile` | Web |
| 1.2.2 | Public profile page — view another user's profile | `public-profile` | Web |
| 1.2.3 | App shell layout — header with nav, user button, main content area | — | Web |

### 1.3 Event CRUD API

| # | Task | Spec | Scope |
|---|------|------|-------|
| 1.3.1 | `POST /api/v1/events` — create event/gig (source=USER, status=OPEN) | `lifecycle` | API |
| 1.3.2 | `GET /api/v1/events` — list with filters (type, category, startDate, endDate, source, status, search, pagination) | `lifecycle` | API |
| 1.3.3 | `GET /api/v1/events/:id` — single event detail | `lifecycle` | API |
| 1.3.4 | `PATCH /api/v1/events/:id` — update (creator only, respect status transitions) | `lifecycle` | API |
| 1.3.5 | `DELETE /api/v1/events/:id` — delete (creator only, cascade) | `lifecycle` | API |
| 1.3.6 | Status transition validation (OPEN→IN_PROGRESS→COMPLETED, OPEN→CANCELLED) | `lifecycle` | API |
| 1.3.7 | Auto-completion cron: mark past events as COMPLETED every 15 min | `lifecycle` | API |
| 1.3.8 | Write tests for all event lifecycle scenarios | `lifecycle` | API |

### 1.4 Event UI

| # | Task | Spec | Scope |
|---|------|------|-------|
| 1.4.1 | Event list page — browse/filter events with pagination | `lifecycle` | Web |
| 1.4.2 | Event detail page — full event info, creator actions (edit/delete/status) | `lifecycle` | Web |
| 1.4.3 | Event creation form — title, description, type, location, dates, compensation (gigs) | `lifecycle` | Web |
| 1.4.4 | Event edit form — pre-filled, respects ownership | `lifecycle` | Web |

**Depends on**: Phase 0
**Blocks**: Phase 2, Phase 3

---

## Phase 2 — Marketplace (Gigs, Collections, Interactions)

**Goal**: Gig application flow works end-to-end. Users can save events to collections.

### 2.1 Gig Applications API

| # | Task | Spec | Scope |
|---|------|------|-------|
| 2.1.1 | `POST /api/v1/gigs/:gigId/applications` — apply with optional message | `gig-applications` | API |
| 2.1.2 | `GET /api/v1/gigs/:gigId/applications` — owner sees all, applicant sees own | `gig-applications` | API |
| 2.1.3 | `PATCH /api/v1/gigs/:gigId/applications/:appId` — accept/reject (owner only, PENDING→ACCEPTED/REJECTED) | `gig-applications` | API |
| 2.1.4 | Validation: no self-apply, no duplicate apply, no apply to cancelled gig, no re-status non-PENDING | `gig-applications` | API |
| 2.1.5 | Auto-create APPLY interaction on application | `gig-applications` | API |
| 2.1.6 | Write tests for all application scenarios | `gig-applications` | API |

### 2.2 Gig Applications UI

| # | Task | Spec | Scope |
|---|------|------|-------|
| 2.2.1 | Apply button + modal on gig detail page | `gig-applications` | Web |
| 2.2.2 | "My Applications" view — applicant sees their applications and statuses | `gig-applications` | Web |
| 2.2.3 | "Manage Applications" view — gig owner sees applicants, accept/reject buttons | `gig-applications` | Web |

### 2.3 Collections API

| # | Task | Spec | Scope |
|---|------|------|-------|
| 2.3.1 | `POST /api/v1/collections` — create collection (default PRIVATE) | `management` | API |
| 2.3.2 | `GET /api/v1/collections` — list user's collections | `management` | API |
| 2.3.3 | `GET /api/v1/collections/:id` — get collection with items (respect visibility) | `management` | API |
| 2.3.4 | `PATCH /api/v1/collections/:id` — rename / change visibility (owner only) | `management` | API |
| 2.3.5 | `DELETE /api/v1/collections/:id` — delete (owner only, cascade) | `management` | API |
| 2.3.6 | `POST /api/v1/collections/:id/items` — add event (409 on dup, SAVE interaction) | `management` | API |
| 2.3.7 | `DELETE /api/v1/collections/:id/items/:eventId` — remove event | `management` | API |
| 2.3.8 | Write tests for collections + visibility scenarios | `management` | API |

### 2.4 Collections UI

| # | Task | Spec | Scope |
|---|------|------|-------|
| 2.4.1 | "Save to Collection" button on event cards/detail pages | `management` | Web |
| 2.4.2 | Collections page — list, create, manage collections | `management` | Web |
| 2.4.3 | Collection detail page — view saved events | `management` | Web |

### 2.5 Interactions API

| # | Task | Spec | Scope |
|---|------|------|-------|
| 2.5.1 | `POST /api/v1/interactions` — record VIEW, SAVE, CLICK, APPLY, DISMISS | `tracking` | API |
| 2.5.2 | Write tests for interaction recording | `tracking` | API |

**Depends on**: Phase 1 (Events exist)
**Blocks**: Phase 4 (Interactions feed recommendations)

---

## Phase 3 — Social

**Goal**: Users can follow each other and see a social feed.

### 3.1 Follows API

| # | Task | Spec | Scope |
|---|------|------|-------|
| 3.1.1 | `POST /api/v1/users/:id/follow` — follow (no self-follow, 409 on dup) | `follows` | API |
| 3.1.2 | `DELETE /api/v1/users/:id/follow` — unfollow | `follows` | API |
| 3.1.3 | `GET /api/v1/users/:id/followers` — paginated list | `follows` | API |
| 3.1.4 | `GET /api/v1/users/:id/following` — paginated list | `follows` | API |
| 3.1.5 | Increment/decrement followerCount and followingCount on User | `follows` | API |
| 3.1.6 | Write tests for follow scenarios | `follows` | API |

### 3.2 Social Feed API

| # | Task | Spec | Scope |
|---|------|------|-------|
| 3.2.1 | `GET /api/v1/social/feed` — events created/saved by followed users | `feed` | API |
| 3.2.2 | Dedup logic: creation > save; order by action timestamp | `feed` | API |
| 3.2.3 | Write tests for feed aggregation + dedup | `feed` | API |

### 3.3 Social UI

| # | Task | Spec | Scope |
|---|------|------|-------|
| 3.3.1 | Follow/unfollow button on public profiles | `follows` | Web |
| 3.3.2 | Followers/following lists on profile pages | `follows` | Web |
| 3.3.3 | Social feed page | `feed` | Web |

**Depends on**: Phase 1 (Users + Events)
**Blocks**: Nothing critical (can parallelize with Phase 2)

---

## Phase 4 — AI & External Data

**Goal**: AI tagging, embeddings, external event ingestion, and recommendations.

### 4.1 AI Model Router

| # | Task | Spec | Scope |
|---|------|------|-------|
| 4.1.1 | Implement model router config (Provider → Model → Task mapping) | `model-router` | API |
| 4.1.2 | Configure Gemini provider (gemini-flash, gemini-pro, text-embed) | `model-router` | API |
| 4.1.3 | Install Vercel AI SDK + Google Generative AI provider | `model-router` | API |

### 4.2 AI Tagging

| # | Task | Spec | Scope |
|---|------|------|-------|
| 4.2.1 | AI tagging service: generate tags, summary, category from event content | `lifecycle` | API |
| 4.2.2 | Hook into event creation (non-blocking; failure → empty tags/null summary) | `lifecycle` | API |
| 4.2.3 | Write tests for tagging (success + graceful failure) | `lifecycle` | API |

### 4.3 Embeddings

| # | Task | Spec | Scope |
|---|------|------|-------|
| 4.3.1 | Enable pgvector extension in Neon | `embeddings` | API |
| 4.3.2 | Generate embeddings on event create/update (text-embedding-004, 768-dim) | `embeddings` | API |
| 4.3.3 | textHash-based staleness detection | `embeddings` | API |
| 4.3.4 | HNSW index for cosine similarity | `embeddings` | API |
| 4.3.5 | Semantic search endpoint (filter by status + future startAt) | `embeddings` | API |
| 4.3.6 | Backfill job for events missing embeddings | `embeddings` | API |
| 4.3.7 | Write tests for embedding generation + search | `embeddings` | API |

### 4.4 External Event Ingestion

| # | Task | Spec | Scope |
|---|------|------|-------|
| 4.4.1 | OSU Content API client (`GET https://content.osu.edu/v2/events`) | `external-ingestion` | API |
| 4.4.2 | Ticketmaster API client (Columbus-area events) | `external-ingestion` | API |
| 4.4.3 | Upsert-by-externalId with itemHash change detection | `external-ingestion` | API |
| 4.4.4 | Cron: sync every 6 hours | `external-ingestion` | API |
| 4.4.5 | AI tagging on ingested events (non-blocking) | `external-ingestion` | API |
| 4.4.6 | Missing-event handling (past → COMPLETED, future → unchanged) | `external-ingestion` | API |
| 4.4.7 | Write tests for ingestion + dedup + hash detection | `external-ingestion` | API |

### 4.5 Recommendations

| # | Task | Spec | Scope |
|---|------|------|-------|
| 4.5.1 | Interim ranking: interest match → popularity → recency → dismiss penalty | `model` | API |
| 4.5.2 | `GET /api/v1/recommendations` — personalized feed with type/limit/offset filters | `feed` | API |
| 4.5.3 | Recommendations UI — personalized feed page (likely the home page) | `feed` | Web |
| 4.5.4 | Write tests for recommendation ranking | `model`, `feed` | API |

**Depends on**: Phase 1 (Events), Phase 2 (Interactions for recommendations)
**Blocks**: Phase 5 (Chatbot uses semantic search)

---

## Phase 5 — Chatbot

**Goal**: Agentic LLM chatbot with tool use and conversation persistence.

### 5.1 Conversations API

| # | Task | Spec | Scope |
|---|------|------|-------|
| 5.1.1 | `POST /api/v1/conversations` — create conversation | `conversations` | API |
| 5.1.2 | `GET /api/v1/conversations` — list (paginated, ordered by updatedAt) | `conversations` | API |
| 5.1.3 | `GET /api/v1/conversations/:id/messages` — message history (paginated) | `conversations` | API |
| 5.1.4 | Title auto-generation from first message (non-blocking) | `conversations` | API |
| 5.1.5 | Write tests for conversation CRUD + ownership | `conversations` | API |

### 5.2 Chatbot Service

| # | Task | Spec | Scope |
|---|------|------|-------|
| 5.2.1 | `POST /api/v1/conversations/:id/messages` — send message, stream SSE response | `chatbot` | API |
| 5.2.2 | System prompt: campus event assistant, use tools, decline off-topic | `chatbot` | API |
| 5.2.3 | Read-only tools: searchEvents, searchGigs, getUserPreferences | `chatbot` | API |
| 5.2.4 | Mutation tools: applyToGig, saveEvent, createEvent (with confirmation) | `chatbot` | API |
| 5.2.5 | Context window: last N messages (default 20) | `chatbot` | API |
| 5.2.6 | Graceful failure: AI unavailable → error message, user message stored | `chatbot` | API |
| 5.2.7 | Write tests for chatbot tool invocations + confirmation flow | `chatbot` | API |

### 5.3 Chat UI

| # | Task | Spec | Scope |
|---|------|------|-------|
| 5.3.1 | Chat page — conversation list sidebar + message area | `conversations` | Web |
| 5.3.2 | Message input + streaming response display | `chatbot` | Web |
| 5.3.3 | Confirmation dialog for mutation tools | `chatbot` | Web |
| 5.3.4 | New conversation creation | `conversations` | Web |

**Depends on**: Phase 4 (semantic search for chatbot tools)
**Blocks**: Nothing

---

## Phase 6 — Polish & Integration

| # | Task | Spec | Scope |
|---|------|------|-------|
| 6.3.1 | Error handling audit — ensure RFC 7807 Problem Details everywhere | `endpoints` | API |
| 6.3.2 | Loading states, empty states, and error states across all pages | — | Web |
| 6.3.3 | Responsive design pass | — | Web |
| 6.3.4 | End-to-end smoke tests (key user flows) | — | Full-stack |

**Depends on**: Phase 5
**Blocks**: Nothing (final phase)

---

## Dependency Graph

```
Phase 0 (Foundation)
   │
   ├──► Phase 1 (Users & Events)
   │       │
   │       ├──► Phase 2 (Marketplace) ──────────────────┐
   │       │                                             │
   │       ├──► Phase 3 (Social) ◄── can parallelize ──►│
   │       │                                             │
   │       └──► Phase 4 (AI & External Data) ◄──────────┘
   │               │
   │               └──► Phase 5 (Chatbot)
   │
   └──► Phase 6 (Polish) ◄── after Phase 5
```

**Parallelization opportunities**:
- Phase 2 and Phase 3 can run in parallel (different developers)
- Phase 4.4 (External Ingestion) can start as soon as Phase 1.3 (Event CRUD) is done
- Phase 6 (Polish) can begin once core features are stable

---

## Task Counts by Phase

| Phase | API Tasks | Web Tasks | Total |
|-------|-----------|-----------|-------|
| 0 — Foundation | 14 | 1 | 15 |
| 1 — Users & Events | 12 | 7 | 19 |
| 2 — Marketplace | 14 | 6 | 20 |
| 3 — Social | 6 | 3 | 9 |
| 4 — AI & External Data | 17 | 1 | 18 |
| 5 — Chatbot | 11 | 4 | 15 |
| 6 — Polish & Integration | 2 | 2 | 4 |
| **Total** | **75** | **22** | **97** |

---

## Testing Strategy

The phase-regression model has been retired now that the delivery phases are complete.

Test cases remain tracked in [`test-cases/`](../test-cases/) alongside specs. Each spec file links to its corresponding test case file, and executable tests reference TC-IDs directly.

### Active automated suites

| Command | Scope |
|---------|-------|
| `bun run test` | Workspace Vitest suites |
| `bun run test:e2e` | Playwright browser integration tests |
| `bun run test:live:ai` | Provider-backed live AI smoke tests |
| `bun run test:registry:audit` | Registry/test-file integrity audit |

Historical `[phase:N]` tags may still appear in older test files, but they are kept as metadata only.

## Notes

- Every task should follow the TDD workflow: spec → test case registry → failing test → implementation → refactor.
- AI-dependent features (tagging, embeddings, chatbot) should always fail gracefully.
- External API integrations (Clerk, Gemini, OSU API, Ticketmaster) need env vars and secrets configured before development.
