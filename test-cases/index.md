# Test Case Registry

This directory manages all test cases — automated and manual — for the Social OSU platform. Test cases are derived from [specs](/specs) and organized by feature area.

## Structure

```
test-cases/
├── index.md                    ← This file (master index)
├── api/
│   └── endpoints.md            ← TC-API-*
├── system/
│   ├── app-pages.md            ← TC-PAGES-*
│   └── debug-page.md           ← TC-DBG-*
├── auth/
│   ├── authentication.md       ← TC-AUTH-*
│   └── authorization.md        ← TC-AUTHZ-*
├── users/
│   ├── profile.md              ← TC-USER-*
│   └── public-profile.md       ← TC-PUB-*
├── events/
│   ├── lifecycle.md            ← TC-EVT-*
│   ├── gig-applications.md     ← TC-APP-*
│   └── external-ingestion.md   ← TC-ING-*
├── social/
│   ├── follows.md              ← TC-FOL-*
│   └── feed.md                 ← TC-SFEED-*
├── collections/
│   └── management.md           ← TC-COL-*
├── interactions/
│   └── tracking.md             ← TC-INT-*
├── ai/
│   ├── model-router.md         ← TC-AI-*
│   └── embeddings.md           ← TC-EMBED-*
├── recommendations/
│   ├── model.md                ← TC-REC-MODEL-*
│   └── feed.md                 ← TC-FEED-*
├── chat/
│   ├── chatbot.md              ← TC-CHAT-*
│   └── conversations.md        ← TC-CONV-*
└── regression/
    ├── phase-0.md              ← Foundation regression suite
    ├── phase-1.md              ← Users & Events regression suite
    ├── phase-2.md              ← Marketplace regression suite
    ├── phase-3.md              ← Social regression suite
    ├── phase-4.md              ← AI & External Data regression suite
    ├── phase-5.md              ← Chatbot regression suite
    └── phase-6.md              ← Polish & Integration regression suite
```

## Test Case Format

Each test case uses this format:

| Field | Description |
|-------|-------------|
| **ID** | Unique identifier, e.g. `TC-AUTH-001` |
| **Spec scenario** | Links back to the spec scenario ID, e.g. `S-AUTH-1` |
| **Type** | `Automated` / `Automated + Manual` / `Manual` / `Semi-automated` |
| **Automated in** | Path to test file (required for automated, automated + manual, and semi-automated cases) |
| **Phase introduced** | Phase where the case first becomes testable |
| **Regression** | `Always` / `Phase N+` / `Final only` |

## Regression Strategy

Regression suites are **cumulative** — each phase includes all prior phases' regression cases. When a milestone closes:

1. **Automated**: CI runs `bun run test:regression:phase-N` (all automated cases up to phase N)
2. **Manual**: A GitHub Issue is auto-created with the manual test checklist for that phase

See [`regression/`](regression/) for per-phase suite definitions.

## Test Scripts

| Command | Description |
|---------|-------------|
| `bun run test` | Run all tests |
| `bun run test:regression:phase-0` | Phase 0 regression (Foundation) |
| `bun run test:regression:phase-1` | Phase 0 + 1 regression |
| `bun run test:regression:phase-2` | Phase 0 + 1 + 2 regression |
| `bun run test:regression:phase-3` | Phase 0 + 1 + 2 + 3 regression |
| `bun run test:regression:phase-4` | Phase 0–4 regression |
| `bun run test:regression:phase-5` | Phase 0–5 regression |
| `bun run test:regression:phase-6` | Full regression |
| `bun run test:manual-checklist -- N` | Generate manual test checklist for phase N |

### Manual Test Checklist Generation

The script `scripts/generate-regression-issue.ts` reads the regression suite for a given phase, resolves all manual TC-IDs from the test case registry, and outputs a fully expanded markdown document with:

- Grouped test cases by feature area
- Numbered steps for each test case
- Expected behavior for each test case
- Pass/Fail checkboxes and notes placeholders

This runs automatically in CI when a milestone closes (`regression.yml`), generating a GitHub Issue with the full manual testing runbook. You can also run it locally to preview:

```sh
bun scripts/generate-regression-issue.ts 1 "Phase 1 — Users & Events"
```

## Tagging Convention

Automated tests use describe-level tags so they can be filtered per phase:

```typescript
describe('[phase:0] [regression:always] Authentication', () => {
  it('TC-AUTH-001: returns 401 when JWT is missing', () => { ... });
});
```

Tags: `[phase:N]` for the phase, `[regression:always]` for inclusion in all regression runs.
