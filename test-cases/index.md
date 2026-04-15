# Test Case Registry

This directory manages all test cases — automated and manual — for the BuckAI Events platform. Test cases are derived from [specs](/specs) and organized by feature area.

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

## Suite Strategy

The phase-based regression model has been retired. The testing plan now uses three active automated layers:

1. **Workspace tests**: `bun run test`
   - Vitest suites in `apps/backend/src/test` and `apps/web/src`
   - covers unit, route, and integration-style tests that do not require a browser
2. **Browser E2E**: `bun run test:e2e`
   - Playwright suites in `e2e/`
   - covers real frontend/backend/browser integration with seeded fixtures
3. **Live AI smoke**: `bun run test:live:ai`
   - provider-backed AI route checks in `apps/backend/src/test/live`
   - covers real Cloudflare AI Gateway and live-model behavior

Manual verification is still tracked in the per-feature test-case files for cases that remain expensive, visual, or environment-specific.

## Test Scripts

| Command | Description |
|---------|-------------|
| `bun run test` | Run all tests |
| `bun run test:integration` | Run browser integration/E2E coverage |
| `bun run test:e2e` | Run Playwright end-to-end tests |
| `bun run test:live:ai` | Run provider-backed live AI smoke tests |
| `bun run test:registry:audit` | Validate TC-ID coverage and registry integrity |

## Tagging Convention

Every automated test should reference at least one TC-ID in the test title so the registry audit can trace registry entries to executable coverage.

Historical `[phase:N]` tags may remain in existing `describe()` blocks, but they are legacy metadata now and are no longer used to drive active regression suites.
