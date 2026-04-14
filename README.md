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
- AI: Vercel AI SDK with Google Gemini, Cloudflare AI Gateway, and OpenAI-compatible provider support
- CI/CD: GitHub Actions

## Project Structure

```text
apps/web/   React frontend (Vite, default local port 5173)
apps/backend/ Hono API backend (default local port 3001)
specs/      Behavior specs and API contracts
plans/      Project roadmap and management docs
```

## Setup

Install dependencies:

```bash
bun install
```

Create the local env files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env
```

Set the required API secrets in `apps/backend/.env`:

- `DATABASE_URL`: your Neon or local Postgres connection string
- `CLERK_SECRET_KEY`: your Clerk secret key for the same Clerk instance you will use in the web app
- `CF_AIG_TOKEN`: Cloudflare AI Gateway token used when a router provider entry references it
- `AI_ROUTER_CONFIG_JSON`: serialized provider/model/task routing and tuning config consumed by the AI router
- any additional provider secret named by a provider entry's `apiKeyEnvVar`

Optional local overrides:

- `apps/backend/.env`
  - `PORT` defaults to `3001`
  - `CORS_ORIGIN` defaults to `http://localhost:5173`
  - `CLERK_PUBLISHABLE_KEY` overrides the repo's default development Clerk publishable key used by the API auth middleware
  - add whatever provider secret names your `AI_ROUTER_CONFIG_JSON` references, for example `CF_AIG_TOKEN`
  - `AI_ROUTER_CONFIG_JSON` can be stored as pretty-printed multiline JSON inside a single quoted env value
  - system prompts stay in application code, not in `AI_ROUTER_CONFIG_JSON`
- `apps/web/.env`
  - `VITE_API_URL` defaults to `http://localhost:3001`
  - `VITE_CLERK_PUBLISHABLE_KEY` overrides the repo's default development Clerk publishable key

Example `AI_ROUTER_CONFIG_JSON`:

```json
{
  "providers": {
    "cf-aig": {
      "id": "cf-aig",
      "type": "CF_AI_GATEWAY",
      "apiKeyEnvVar": "CF_AIG_TOKEN",
      "accountId": "2b7085f62464ab452fbd1c9569cedaef",
      "gateway": "esperta-gateway"
    }
  },
  "models": {
    "social-osu": {
      "id": "social-osu",
      "providerId": "cf-aig",
      "modelId": "dynamic/social-osu",
      "type": "GENERATIVE",
      "maxTokens": 2048,
      "contextWindow": 1000000
    },
    "social-osu-embedding": {
      "id": "social-osu-embedding",
      "providerId": "cf-aig",
      "modelId": "dynamic/social-osu-embedding",
      "type": "EMBEDDING",
      "dimensions": 768,
      "contextWindow": 131072
    }
  },
  "tasks": {
    "chatbot": {
      "id": "chatbot",
      "modelId": "social-osu",
      "temperature": 0.7
    },
    "tagging": {
      "id": "tagging",
      "modelId": "social-osu",
      "temperature": 0.3,
      "maxOutputTokens": 300
    },
    "title-generation": {
      "id": "title-generation",
      "modelId": "social-osu",
      "temperature": 0.5,
      "maxOutputTokens": 80
    },
    "embedding": {
      "id": "embedding",
      "modelId": "social-osu-embedding"
    }
  }
}
```

In the current gateway setup, `dynamic/social-osu` routes to `MiniMax-M2.7` and `dynamic/social-osu-embedding` routes to `nvidia/llama-nemotron-embed-vl-1b-v2:free`.

Generate the Prisma client and initialize the database schema:

```bash
bun run db:generate
bun run db:push
```

## Development

Start both apps:

```bash
bun run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- API base path: `http://localhost:3001/api/v1`

Notes:

- The web app and local API both use a checked-in development Clerk publishable key by default so a clean clone can boot without extra public-key setup.
- Authenticated API requests still require `CLERK_SECRET_KEY` in `apps/backend/.env`.

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
   cd apps/backend && wrangler secret put DATABASE_URL
   ```
3. Set the production Clerk secret.
   ```bash
   cd apps/backend && wrangler secret put CLERK_SECRET_KEY
   ```
4. Set the AI provider secrets used by your router config.
   ```bash
   cd apps/backend && wrangler secret put GOOGLE_GENERATIVE_AI_API_KEY
   cd apps/backend && wrangler secret put OPENAI_PRIMARY_API_KEY
   ```
5. Set `AI_ROUTER_CONFIG_JSON` in your deployment environment to the serialized router config.

If you deploy against a different Clerk instance than the repo default, set
`VITE_CLERK_PUBLISHABLE_KEY` in the build environment before `bun run deploy`.

Manual deploy:

```bash
bun run deploy
```

Local Cloudflare simulation:

```bash
bun --cwd apps/web run build
cd apps/backend && wrangler dev
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
