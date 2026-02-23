# social-osu-app

Initial setup with:

- Monorepo: Turborepo
- Frontend: React (with Vite), TanStack Router, Tailwind CSS, shadcn/ui
- Backend: Hono, Prisma ORM, PostgreSQL (Neon)
- Runtime: Bun (local dev) / Cloudflare Workers (production)
- CI/CD: GitHub Actions

## Install

```bash
bun install
```

## Configure Database

```bash
cp apps/api/.env.example apps/api/.env
```

Set `DATABASE_URL` in `apps/api/.env` to your Neon connection string.

## Generate Prisma Client

```bash
bun run db:generate
```

## Run Development

```bash
bun run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Deploy to Cloudflare Workers

The frontend and backend are deployed as a **single Cloudflare Worker** (`social-osu`).
Static assets (React app) are served directly by CF; API routes (`/api/*`) are handled by Hono.

### Prerequisites

1. Install Wrangler and log in:
   ```bash
   bunx wrangler login
   ```

2. Set the database secret (one time):
   ```bash
   cd apps/api && wrangler secret put DATABASE_URL
   ```

### Deploy

```bash
bun run deploy
```

This builds the React app then deploys the unified worker. Or from the api package directly:

```bash
cd apps/api && bun run deploy
```

### Local CF Workers simulation

Build the frontend first, then run wrangler dev:

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
