# Social OSU — Development Guide

## Source of Truth

All development follows the specs in `/specs`. The spec index is at `/specs/index.md`.
Before implementing any feature, read the relevant spec. If a spec is missing or unclear, update it first.

## Agent Instructions

See `AGENTS.md` for the full development workflow. It applies to all agents working on this codebase.

## Development Workflow

### Specs-Driven Development

1. Every feature, endpoint, and behavior is defined in a spec file before code is written.
2. Specs describe system behavior using scenario-behavior testcases (Given/When/Then).
3. If a spec does not exist for what you are building, write the spec first.
4. If implementation diverges from a spec, update the spec to match the shipped behavior.

### Test-Driven Development (Red-Green)

1. **Red**: Write a failing test based on the scenario-behavior testcase in the spec.
2. **Green**: Write the minimum code to make the test pass.
3. **Refactor**: Clean up the code while keeping tests green.
4. Repeat for each behavior in the spec.

Tests are behavior-driven: they test what the system does, not how it does it.

## Tech Stack

- **Monorepo**: Turborepo + Bun
- **Frontend**: React + Vite + TanStack Router/Query, Tailwind CSS, shadcn/ui
- **Backend**: Hono on Cloudflare Workers
- **Database**: Neon PostgreSQL via Prisma ORM
- **Auth**: Clerk (restricted to OSU email domains)
- **LLM**: Google Gemini via Vercel AI SDK
- **CI/CD**: GitHub Actions → Cloudflare Workers

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start both frontend and backend |
| `bun run build` | Build all apps |
| `bun run lint` | Lint all apps |
| `bun run typecheck` | Typecheck all apps |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:push` | Push schema to database |

## Project Structure

```
apps/web/          → React frontend (port 5173)
apps/api/          → Hono API backend (port 3001)
specs/             → Behavior specs (source of truth)
```
