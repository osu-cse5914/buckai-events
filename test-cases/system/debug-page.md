# Debug Page — Test Cases

**Spec**: [`/specs/system/debug-page.md`](../../specs/system/debug-page.md)

## Test Cases

| ID | Spec Scenario | Description | Type | Automated in | Phase | Regression |
|----|---------------|-------------|------|-------------|-------|------------|
| TC-DBG-001 | S-DBG-1 | Debug stays out of the primary navigation model | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-002 | S-DBG-2 | Debug page renders heading and tool buttons | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-003 | S-DBG-3 | Health check displays API status | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-004 | S-DBG-4 | DB connection check displays status | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-005 | S-DBG-5 | User profile viewer navigates to user page | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-006 | S-DBG-3 | Health check displays error on failure | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-007 | S-DBG-4 | DB check displays error on failure | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 1 | Always |
| TC-DBG-008 | S-DBG-6 | Admin sees the external sync control | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 6 | Always |
| TC-DBG-009 | S-DBG-7 | Non-admin does not see the external sync control | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 6 | Always |
| TC-DBG-010 | S-DBG-8 | Successful external sync shows returned counts | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 6 | Always |
| TC-DBG-011 | S-DBG-9 | Failed external sync shows an error state | Automated | `apps/web/src/routes/_authenticated/debug/-index.test.tsx` | 6 | Always |
