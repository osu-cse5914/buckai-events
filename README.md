# social-osu-app

Initial setup with:

- Monorepo: Turborepo
- Frontend: React (with Vite), TanStack Router, Tailwind CSS, shadcn/ui
- Backend: Express, Prisma ORM, PostgreSQL
- Runtime: Bun
- CI/CD: GitHub Actions

## Install

```bash
bun install
```

## Configure Database

```bash
cp apps/api/.env.example apps/api/.env
```

Set `DATABASE_URL` in `apps/api/.env`.

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

## References

- Turborepo: https://turbo.build/repo/docs
- Bun: https://bun.sh/docs
- React: https://react.dev
- TanStack Router: https://tanstack.com/router/latest/docs
- Vite: https://vite.dev/guide
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/docs
- Express: https://expressjs.com
- Prisma ORM: https://www.prisma.io/docs
- PostgreSQL: https://www.postgresql.org/docs
