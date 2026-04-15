# BuckAI Events

An AI-powered campus discovery platform for The Ohio State University students. BuckAI Events aggregates on-campus and off-campus events, supports a student-only gig marketplace, delivers personalized recommendations, and provides a conversational LLM chatbot for natural-language event discovery.

## Features

- **Event Discovery** — Browse and search campus events with AI-generated tags and embeddings-powered recommendations
- **Gig Marketplace** — Student-only gig board with application tracking
- **BuckAI Chatbot** — Conversational agent for natural-language event and gig discovery
- **Collections** — Save and organize events and gigs into personal collections
- **Social** — Follow other students and get personalized feed recommendations
- **Auth** — OSU email-restricted access via Clerk

## Tech Stack

- Frontend: React + Vite + TanStack Router/Query + Tailwind CSS + shadcn/ui
- Backend: Hono on Cloudflare Workers
- Database: Neon PostgreSQL via Prisma ORM
- Auth: Clerk (OSU email restricted)
- AI: Vercel AI SDK with OpenAI- and Google-compatible provider support

## Project Structure

```
apps/web/      React frontend
apps/backend/  Hono API backend
specs/         Behavior specs and API contracts
plans/         Roadmap and project management
```

## API Reference

- Spec index: [`specs/index.md`](specs/index.md)
- REST endpoint catalog: [`specs/api/endpoints.md`](specs/api/endpoints.md)
- OpenAPI contract: [`specs/api/openapi.yaml`](specs/api/openapi.yaml)

All REST endpoints are prefixed with `/api/v1`.

## References

- [Turborepo](https://turbo.build/repo/docs)
- [Bun](https://bun.sh/docs)
- [React](https://react.dev)
- [TanStack Router](https://tanstack.com/router/latest/docs)
- [Vite](https://vite.dev/guide)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Hono](https://hono.dev/docs)
- [Prisma ORM](https://www.prisma.io/docs)
- [Neon](https://neon.tech/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
