# System Architecture

## Monorepo Structure

The system is a Turborepo monorepo managed with Bun. It contains two applications:

- `apps/web` — React + Vite frontend served as Cloudflare Workers static assets.
- `apps/backend` — Hono REST API deployed to Cloudflare Workers.

## Deployment Topology

A single Cloudflare Worker (`social-osu`) serves both the frontend static assets and the API. The worker configuration in `apps/backend/wrangler.toml` references `../web/dist` as the static asset directory.

```
Client Browser
      │
      ▼
Cloudflare Worker (social-osu)
      │
      ├── /api/*  →  Hono API routes
      │                   │
      │                   ▼
      │             Neon PostgreSQL
      │
      └── /*      →  Static assets (React SPA)
```

## External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| Clerk | Identity and authentication | `@hono/clerk-auth` middleware, JWT verification |
| Neon PostgreSQL | Primary database | Prisma ORM with `@prisma/adapter-neon` |
| Google Gemini | LLM (chatbot, tagging, title generation) and embeddings | Vercel AI SDK via shared AI model router |
| Ticketmaster API | Off-campus event data | Scheduled cron trigger, REST API |
| OSU Events Feed | On-campus event data | Scheduled cron trigger |

## Frontend Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build tool | Vite |
| Routing | TanStack Router (file-based) |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui (Radix primitives) |

## Backend Stack

| Layer | Technology |
|-------|-----------|
| Framework | Hono |
| Runtime | Cloudflare Workers (production), Bun (development) |
| ORM | Prisma with Neon serverless adapter |
| Vector search | pgvector extension on Neon PostgreSQL |
| Auth middleware | `@hono/clerk-auth` |
| AI SDK | Vercel AI SDK, routed through shared AI model router |

## CI/CD

GitHub Actions pipeline with three stages:

1. **secret-scan** — TruffleHog scans for leaked secrets.
2. **checks** — Install, generate Prisma client, lint, typecheck, build. Uploads `apps/web/dist` as artifact.
3. **deploy-preview** (on PR) — Uploads preview version via `wrangler versions upload`.
4. **deploy-production** (on main push) — Deploys via `wrangler deploy`.

## Development Ports

| App | Port |
|-----|------|
| Frontend (Vite) | 5173 |
| Backend (Bun) | 3001 |

In development, Vite proxies `/api/*` requests to the backend on port 3001.
