# Social OSU — Agent Development Workflow

This file defines the development workflow for all agents working on this codebase.

## Source of Truth

All development follows the specs in `/specs`. The spec index is at `/specs/index.md`.
Before implementing any feature, read the relevant spec. If a spec is missing or unclear, update it first.

## Specs-Driven Development

1. Every feature, endpoint, and behavior is defined in a spec file before code is written.
2. Specs describe system behavior using scenario-behavior testcases (Given/When/Then).
3. If a spec does not exist for what you are building, write the spec first.
4. If implementation diverges from a spec, update the spec to match the shipped behavior.

## Test-Driven Development (Red-Green)

1. **Red**: Write a failing test based on the scenario-behavior testcase in the spec.
2. **Green**: Write the minimum code to make the test pass.
3. **Refactor**: Clean up the code while keeping tests green.
4. Repeat for each behavior in the spec.

Tests are behavior-driven: they test what the system does, not how it does it.

## Workflow Rules

- Read the spec before writing any code.
- Write the test before writing the implementation.
- One behavior at a time: red → green → refactor → next behavior.
- Do not skip the red step. If the test already passes, the test is not testing new behavior.
- Do not add code that is not covered by a spec behavior.
- When a spec changes, update the corresponding tests first, then update the implementation.

## Project Management

- The project roadmap lives in `plans/roadmap.md`. It defines phases, task breakdowns, and dependencies.
- Individual tasks are tracked as GitHub Issues, organized by Milestones (one per phase).
- Before starting work, check for a GitHub Issue. If one exists, read the linked spec first.
- One issue = one PR. Keep scope small and focused.
- Agents do not merge PRs. Only humans merge.
- Agents do not modify specs. If behavior is unclear, ask or leave a comment on the issue.
- Label your issue `agent:in-progress` when you start and `agent:review` when you open the PR.

### Labels

- `phase:0-foundation` through `phase:6-polish` — which phase
- `scope:api`, `scope:web`, `scope:full-stack` — what part of the stack
- `type:feature`, `type:test`, `type:infra`, `type:bug` — what kind of work
- `agent:ready`, `agent:in-progress`, `agent:review` — agent workflow state

## Commit Messages

- Use Conventional Commits for all commits.
- Format commit messages as `type(scope): summary` when a scope is useful, or `type: summary` when it is not.
- Common types in this repo include `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, and `revert`.
- Keep the summary concise and imperative.

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
plans/             → Project roadmap and management docs
```
