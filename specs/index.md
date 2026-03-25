# Social OSU — Spec Index

Social OSU is an AI-powered campus discovery platform for The Ohio State University students. It aggregates on-campus and off-campus events, supports a student-only gig marketplace, delivers personalized recommendations, and provides an agentic LLM chatbot for natural-language event discovery.

**Not in scope**: ticket sales, payment processing, financial transactions.

**Test Cases**: Each spec links to a corresponding test case file in [`/test-cases`](../test-cases/index.md). Test cases include both automated (Vitest) and manual cases, organized for cumulative regression testing per milestone.

## Modules

### System

- [Architecture](system/architecture.md) — high-level system architecture, deployment, infrastructure
- [App Pages](system/app-pages.md) — page inventory, navigation model, and page vs overlay boundaries
- [Data Model](system/data-model.md) — entities, relationships, enums
- [Debug Page](system/debug-page.md) — developer debug page with diagnostic tools

### Auth

- [Authentication](auth/authentication.md) — Clerk integration, OSU email restriction, JWT handling
- [Authorization](auth/authorization.md) — permission rules, ownership checks

### Users

- [Profile](users/profile.md) — user profile management, preferences, interests
- [Public Profile](users/public-profile.md) — public-facing personal page visible to other users

### Social

- [Follows](social/follows.md) — follow/unfollow users, follower/following lists
- [Social Feed](social/feed.md) — event feed from followed users

### Events

- [Event Lifecycle](events/lifecycle.md) — event CRUD, status transitions, auto-completion
- [Gig Applications](events/gig-applications.md) — gig application flow, acceptance, rejection
- [External Ingestion](events/external-ingestion.md) — OSU API and Ticketmaster sync, dedup, normalization

### Collections

- [Management](collections/management.md) — save/bookmark events, collection CRUD, configurable visibility

### Interactions

- [Tracking](interactions/tracking.md) — implicit user signal capture for recommendations

### AI

- [Model Router](ai/model-router.md) — shared AI configuration: Provider → Model → Task architecture
- [Embeddings & Vector Search](ai/embeddings.md) — event embeddings, pgvector storage, semantic search

### Recommendations

- [Model](recommendations/model.md) — recommendation model [WIP], interim heuristic ranking
- [Feed](recommendations/feed.md) — personalized feed serving, blended events+gigs, filtering

### Chat

- [Chatbot](chat/chatbot.md) — agentic LLM chatbot, tool use, confirmation flow
- [Conversations](chat/conversations.md) — conversation persistence, message history

### API

- [Endpoints](api/endpoints.md) — REST API resource catalog, request/response shapes
