# Debug Page — Test Cases

**Spec**: [`/specs/system/debug-page.md`](../../specs/system/debug-page.md)

## Test Cases

| ID | Spec Scenario | Description | Type | Automated in | Phase | Regression |
|----|---------------|-------------|------|-------------|-------|------------|
| TC-DBG-001 | S-DBG-1 | Debug nav link appears in header | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-002 | S-DBG-2 | Debug page renders heading and tool buttons | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-003 | S-DBG-3 | Health check displays API status | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-004 | S-DBG-4 | DB connection check displays status | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-005 | S-DBG-5 | User profile viewer navigates to user page | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-006 | S-DBG-3 | Health check displays error on failure | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-007 | S-DBG-4 | DB check displays error on failure | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
