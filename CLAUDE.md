# Social OSU — Development Guide

## Source of Truth

All development follows the specs in `/specs`. The spec index is at `/specs/index.md`.
Before implementing any feature, read the relevant spec. If a spec is missing or unclear, update it first.

## Agent Instructions

See `AGENTS.md` for the full development workflow. It applies to all agents working on this codebase.

## Project Management

- Roadmap and phase breakdown: `plans/roadmap.md`
- Tasks are tracked as GitHub Issues with Milestones per phase.
- Check GitHub Issues before starting work. Read the linked spec in every issue.
- See `plans/project-management.md` for the full workflow, labels, and collaboration rules.

### Issue Blocking Relationships

When creating GitHub Issues, always set blocking relationships using the GitHub GraphQL API. This keeps the dependency graph visible in the GitHub UI "Relationships" section.

```bash
# Mark issue as "blocked by" another issue
gh api graphql -f query='
  mutation {
    addBlockedBy(input: {issueId: "<BLOCKED_ISSUE_NODE_ID>", blockingIssueId: "<BLOCKER_ISSUE_NODE_ID>"}) {
      clientMutationId
    }
  }'
```

To get a node ID from an issue number:
```bash
gh issue list --json number,id --jq '.[] | select(.number == 42) | .id'
```

Every new issue must have its blocking relationships set at creation time. Check `plans/roadmap.md` for the dependency graph between tasks.

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
| `bun run test` | Run all tests |
| `bun run test:regression:phase-N` | Run cumulative regression for phase 0–N |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:push` | Push schema to database |

## Project Structure

```
apps/web/          → React frontend (port 5173)
apps/backend/      → Hono API backend (port 3001)
specs/             → Behavior specs (source of truth)
test-cases/        → Test case registry (automated + manual)
plans/             → Project roadmap and management docs
```
