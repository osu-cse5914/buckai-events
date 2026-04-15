# BuckAI Events — Agent Development Workflow

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

## Test Case Registry

All test cases — automated and manual — are tracked in `/test-cases`. Each spec file links to its corresponding test case file.

### Tagging Convention

All automated tests must reference their TC-ID in the test title:

```typescript
describe("Feature Name", () => {
  it("TC-XXX-001: behavior description", () => { ... });
});
```

Historical `[phase:N]` tags may remain in existing `describe()` blocks, but they are legacy metadata and are no longer used to drive active regression suites.

### When Writing Tests

1. Check the test case registry (`/test-cases/<area>/<feature>.md`) for the TC-ID corresponding to the spec scenario.
2. Use the TC-ID in the `it()` description (e.g., `it('TC-AUTH-005: returns 401 when JWT is missing', ...)`).
3. If a test case does not yet exist in the registry for new behavior, add it to the registry first.

### Test Suite Model

The phase-based regression model is retired. The active automated suites are:

- **Workspace tests**: `bun run test`
- **Browser integration/E2E**: `bun run test:e2e`
- **Live AI smoke**: `bun run test:live:ai`
- **Registry audit**: `bun run test:registry:audit`

## Workflow Rules

- Read the spec before writing any code.
- Check the test case registry (`/test-cases`) for existing TC-IDs before writing tests.
- Write the test before writing the implementation.
- One behavior at a time: red → green → refactor → next behavior.
- Do not skip the red step. If the test already passes, the test is not testing new behavior.
- Do not add code that is not covered by a spec behavior.
- When a spec changes, update the corresponding tests and test case registry first, then update the implementation.

## Project Management

- The project roadmap lives in `plans/roadmap.md`. It is the historical delivery plan plus current dependency context.
- Individual tasks are tracked as GitHub Issues.
- Before starting work, check for a GitHub Issue. If one exists, read the linked spec first.
- One issue = one PR. Keep scope small and focused.
- Agents do not merge PRs. Only humans merge.
- Agents do not modify specs. If behavior is unclear, ask or leave a comment on the issue.
- Label your issue `agent:in-progress` when you start and `agent:review` when you open the PR.

### Labels

- `scope:api`, `scope:web`, `scope:full-stack` — what part of the stack
- `agent:in-progress`, `agent:review` — agent workflow state
- `timebox:N` — optional planning label if the team chooses to use sprint/timebox grouping

Issue types (Feature, Task, Bug) are set via GitHub's native issue type field, not labels.

### Issue Blocking Relationships

When creating GitHub Issues, always set blocking relationships using the GitHub GraphQL API. This uses GitHub's native "Blocked by" / "Blocking" relationship (visible in the Relationships section of each issue), not comments or sub-issues.

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

Rules:
- Every new issue must have its blocking relationships set at creation time.
- Check `plans/roadmap.md` for the dependency graph between tasks.
- Only set direct dependencies, not transitive ones (if A blocks B blocks C, do not mark A as blocking C).

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
| `bun run test:e2e` | Run browser end-to-end tests |
| `bun run test:live:ai` | Run live AI smoke tests |
| `bun run test:registry:audit` | Audit test-case registry coverage |
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
