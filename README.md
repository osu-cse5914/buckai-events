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

### Prerequisites

1. Install Wrangler and log in:
   ```bash
   bunx wrangler login
   ```

2. Set the API database secret (one time):
   ```bash
   cd apps/api && wrangler secret put DATABASE_URL
   ```

3. After the first `wrangler deploy`, update `CORS_ORIGIN` in
   `apps/api/wrangler.toml` with the deployed web Worker URL, then redeploy.

### Deploy both apps

```bash
bun run deploy
```

Or deploy individually:

```bash
# API Worker
cd apps/api && wrangler deploy

# Web (builds first, then deploys static assets)
cd apps/web && bun run deploy
```

### Local CF Workers simulation

```bash
# Create apps/api/.dev.vars with DATABASE_URL=...
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
