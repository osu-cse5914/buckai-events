# App Pages - Test Cases

**Spec**: [`/specs/system/app-pages.md`](../../specs/system/app-pages.md)

## Test Cases

| ID | Spec Scenario | Description | Type | Automated in | Phase | Regression |
| --- | --- | --- | --- | --- | --- | --- |
| TC-PAGES-001 | S-PAGES-1 | Authenticated landing resolves to Featured rather than Catalog | Manual | - | 6 | Phase 6+ |
| TC-PAGES-002 | S-PAGES-2 | Catalog renders as neutral browse, distinct from Featured recommendations | Manual | - | 6 | Phase 6+ |
| TC-PAGES-003 | S-PAGES-3 | Collections and applications are reached through You, not top-level tabs | Manual | - | 6 | Phase 6+ |
| TC-PAGES-004 | S-PAGES-4 | My Profile is reached from the avatar menu and remains separate from You | Manual | - | 6 | Phase 6+ |
| TC-PAGES-005 | S-PAGES-5 | Avatar menu exposes account and session actions without becoming primary navigation | Manual | - | 6 | Phase 6+ |
| TC-PAGES-006 | S-PAGES-6 | Save to collection uses an overlay flow instead of a standalone page | Manual | - | 6 | Phase 6+ |
| TC-PAGES-007 | S-PAGES-7 | Apply to gig uses an overlay flow and records surface later under You applications | Manual | - | 6 | Phase 6+ |
| TC-PAGES-008 | S-PAGES-8 | Search offers AI enhancement and a clear handoff into AI mode | Manual | - | 6 | Phase 6+ |
| TC-PAGES-009 | S-PAGES-9 | AI is exposed as a dedicated chat-based agent destination in primary navigation | Manual | - | 6 | Phase 6+ |
| TC-PAGES-010 | S-PAGES-1 | Authenticated root redirects to the canonical Featured route | Automated | `apps/web/src/routes/_authenticated/-app-pages.test.tsx` | 6 | Always |
| TC-PAGES-011 | S-PAGES-9 | Primary nav exposes Featured, Catalog, Search, AI, and You only | Automated | `apps/web/src/routes/_authenticated/-app-pages.test.tsx` | 6 | Always |
| TC-PAGES-012 | S-PAGES-8 | Search forwards the current query to the events API | Automated | `apps/web/src/routes/_authenticated/search/-index.test.tsx` | 6 | Always |
| TC-PAGES-013 | S-PAGES-8 | Search handoff link carries the current prompt into AI mode | Automated | `apps/web/src/routes/_authenticated/search/-index.test.tsx` | 6 | Always |
| TC-PAGES-014 | S-PAGES-3 | Your Events page scopes results to the authenticated user | Automated | `apps/web/src/routes/_authenticated/you/events/-index.test.tsx` | 6 | Always |
| TC-PAGES-015 | S-PAGES-2 | Legacy `/events` route redirects to canonical `/catalog` | Automated | `apps/web/src/routes/_authenticated/events/-index.test.tsx` | 6 | Always |
| TC-PAGES-016 | S-PAGES-3 | Legacy `/applications` route redirects to canonical `/you/applications` | Automated | `apps/web/src/routes/_authenticated/applications/-index.test.tsx` | 6 | Always |
