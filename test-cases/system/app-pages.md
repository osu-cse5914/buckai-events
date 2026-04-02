# App Pages - Test Cases

**Spec**: [`/specs/interface/app-pages.md`](../../specs/interface/app-pages.md)

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
| TC-PAGES-011 | S-PAGES-9 | The authenticated shell tab bar exposes Featured, Catalog, and You while Search and AI remain separate shell controls | Automated | `apps/web/src/routes/_authenticated/-app-pages.test.tsx` | 6 | Always |
| TC-PAGES-012 | S-PAGES-8 | Search forwards the current query to semantic search and resets pagination after a debounced edit | Automated | `apps/web/src/routes/_authenticated/search/-index.test.tsx` | 6 | Always |
| TC-PAGES-013 | S-PAGES-8 | Search handoff link carries the current prompt into AI mode | Automated | `apps/web/src/routes/_authenticated/search/-index.test.tsx` | 6 | Always |
| TC-PAGES-014 | S-PAGES-3 | Your Events page scopes results to the authenticated user | Automated | `apps/web/src/routes/_authenticated/you/events/-index.test.tsx` | 6 | Always |
| TC-PAGES-017 | S-PAGES-10 | Legacy browse routes restore URL-owned filters and selected listing through route validation and first-batch loader priming | Automated | `apps/web/src/routes/_authenticated/events/-index.test.tsx`, `apps/web/src/routes/_authenticated/gigs/-index.test.tsx` | 6 | Always |
| TC-PAGES-018 | S-PAGES-11 | Search restores URL-owned query, filters, and pagination through route validation and loader priming | Automated | `apps/web/src/routes/_authenticated/search/-index.test.tsx` | 6 | Always |
| TC-PAGES-019 | S-PAGES-3 | You subpages expose navigation back to the You hub | Automated | `apps/web/src/routes/_authenticated/you/collections/-index.test.tsx` | 6 | Always |
| TC-PAGES-020 | S-PAGES-8 | Search renders a results-shaped skeleton while an active query is loading | Automated | `apps/web/src/routes/_authenticated/search/-index.test.tsx` | 6 | Always |
| TC-PAGES-021 | S-PAGES-3 | Your Events renders a You-subpage skeleton while current-user data is loading | Automated | `apps/web/src/routes/_authenticated/you/events/-index.test.tsx` | 6 | Always |
| TC-PAGES-022 | S-PAGES-8 | Event detail returns to the preserved search results when opened from Search | Automated | `apps/web/src/routes/_authenticated/search/-index.test.tsx`, `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx` | 6 | Always |
| TC-PAGES-023 | S-PAGES-11 | Search falls back to the structured events listing when only explicit filters are active | Automated | `apps/web/src/routes/_authenticated/search/-index.test.tsx` | 6 | Always |
| TC-PAGES-024 | S-PAGES-12 | AI landing preserves a carried prompt draft and allows editing it in-place | Automated | `apps/web/src/routes/_authenticated/ai/-index.test.tsx` | 6 | Always |
| TC-PAGES-025 | S-PAGES-8 | Search query execution targets semantic search when a query is present | Automated | `apps/web/src/components/events/events-browser.test.tsx` | 6 | Always |
