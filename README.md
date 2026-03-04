# Social OSU

Social OSU is an AI-powered campus discovery platform for The Ohio State University students. It aggregates on-campus and off-campus events, supports a student-only gig marketplace, delivers personalized recommendations, and provides an agentic LLM chatbot for natural-language event discovery.

## Docs

Browse the specs and interactive API reference at [social-osu-docs.pages.dev](https://social-osu-docs.pages.dev).

## Source of Truth

Product and API behavior are defined in [`specs/`](specs/). Read the relevant spec before changing implementation.

- Spec index: [`specs/index.md`](specs/index.md)
- REST endpoint catalog: [`specs/api/endpoints.md`](specs/api/endpoints.md)
- OpenAPI contract: [`specs/api/openapi.yaml`](specs/api/openapi.yaml)

All REST endpoints are prefixed with `/api/v1`.

## Project Management

Development is organized into 7 phases tracked via GitHub Issues and Milestones:

| Phase | Focus |
|-------|-------|
| 0 | Foundation (schema, auth, tooling) |
| 1 | Users & Events (core CRUD) |
| 2 | Marketplace (gigs, collections) |
| 3 | Social (follows, feed) |
| 4 | AI & External Data (embeddings, ingestion, recommendations) |
| 5 | Chatbot (conversations, LLM tool use) |
| 6 | Polish & Integration |

- Roadmap: [`plans/roadmap.md`](plans/roadmap.md)
- Workflow & labels: [`plans/project-management.md`](plans/project-management.md)
- Issues: [GitHub Issues](https://github.com/osu-cse5914/social-osu-app/issues)

## Tech Stack

- Monorepo: Turborepo + Bun
- Frontend: React + Vite + TanStack Router/Query + Tailwind CSS + shadcn/ui
- Backend: Hono on Cloudflare Workers
- Database: Neon PostgreSQL via Prisma ORM
- Auth: Clerk (OSU email restricted)
- AI: Google Gemini via Vercel AI SDK
- CI/CD: GitHub Actions

## Project Structure

```text
apps/web/   React frontend (Vite, default local port 5173)
apps/api/   Hono API backend (default local port 3001)
specs/      Behavior specs and API contracts
plans/      Project roadmap and management docs
```

## Setup

Install dependencies:

```bash
bun install
```

Create the API env file:

```bash
cp apps/api/.env.example apps/api/.env
```

Set `DATABASE_URL` in `apps/api/.env` to your Neon connection string.

Generate the Prisma client:

```bash
bun run db:generate
```

## Development

Start both apps:

```bash
bun run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- API base path: `http://localhost:3001/api/v1`

## Common Commands

| Command | Description |
|---|---|
| `bun run dev` | Start frontend and backend |
| `bun run build` | Build all apps |
| `bun run lint` | Lint all apps |
| `bun run typecheck` | Typecheck all apps |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:push` | Push Prisma schema to the database |
| `bun run deploy` | Build and deploy via the app deploy scripts |

## Deployment

Frontend and backend are served from a single Cloudflare Worker (`social-osu`). Static assets are served by the worker, and API routes are handled by Hono.

First-time Cloudflare setup:

1. Log in to Wrangler.
   ```bash
   bunx wrangler login
   ```
2. Set the production database secret.
   ```bash
   cd apps/api && wrangler secret put DATABASE_URL
   ```

Manual deploy:

```bash
bun run deploy
```

Local Cloudflare simulation:

```bash
bun --cwd apps/web run build
cd apps/api && wrangler dev
```

## References

- Turborepo: https://turbo.build/repo/docs
- Bun: https://bun.sh/docs
- React: https://react.dev
- TanStack Router: https://tanstack.com/router/latest/docs
- Vite: https://vite.dev/guide
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/docs
- Hono: https://hono.dev/docs
- Prisma ORM: https://www.prisma.io/docs
- Neon: https://neon.tech/docs
- Cloudflare Workers: https://developers.cloudflare.com/workers
- Wrangler: https://developers.cloudflare.com/workers/wrangler
