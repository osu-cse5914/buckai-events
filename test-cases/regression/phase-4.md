# Phase 4 Regression Suite — AI & External Data

Run this suite when the Phase 4 milestone is closed. Includes all Phase 0–3 regression.

## Automated

```sh
bun run test:regression:phase-4
```

### Included automated test cases

#### Phase 0–3 (re-run)

All automated cases from prior regression suites.

#### Phase 4 — AI Model Router

- **TC-AI-001**: Resolve task to model and provider
- **TC-AI-002**: Model swap without code change
- **TC-AI-003**: Provider unavailable
- **TC-AI-004**: Unknown task ID
- **TC-AI-005**: Embedding task returns vectors

#### Phase 4 — AI Tagging (now testable on events)

- **TC-EVT-012**: AI auto-tagging on creation
- **TC-EVT-013**: AI tagging failure does not block creation

#### Phase 4 — Embeddings

- **TC-EMBED-001**: Embedding generated on event creation
- **TC-EMBED-002**: Embedding regenerated on content change
- **TC-EMBED-003**: Embedding not regenerated on non-content change
- **TC-EMBED-004**: Semantic search returns relevant results
- **TC-EMBED-005**: Semantic search combined with structured filter
- **TC-EMBED-006**: Embedding failure does not block event creation
- **TC-EMBED-007**: Backfill generates missing embeddings
- **TC-EMBED-008**: Event deletion cascades to embedding
- **TC-EMBED-010**: Embedding generation requests configured dimensions
- **TC-EMBED-011**: Embedding generation rejects mismatched vector lengths

#### Phase 4 — External Ingestion

- **TC-ING-001**: New OSU event ingested
- **TC-ING-002**: Existing event updated (hash changed)
- **TC-ING-003**: Existing event unchanged (hash match)
- **TC-ING-004**: Ticketmaster event ingested
- **TC-ING-005**: Stale external event completed
- **TC-ING-006**: Dedup prevents duplicates
- **TC-ING-007**: AI tagging failure does not block ingestion
- **TC-ING-008**: Updated event preserves original tags
- **TC-ING-009**: Disappeared event with future endAt unchanged
- **TC-ING-010**: Only Columbus campus events ingested

#### Phase 4 — Event source filtering (now testable)

- **TC-EVT-007**: Cannot modify external event
- **TC-EVT-015**: Filter events by source

#### Phase 4 — Recommendations

- **TC-REC-MODEL-001**: Interest-based boost
- **TC-REC-MODEL-002**: Popularity ranking
- **TC-REC-MODEL-003**: Recency ranking
- **TC-REC-MODEL-004**: Dismissed events excluded
- **TC-REC-MODEL-005**: Past events excluded
- **TC-REC-MODEL-006**: No interests — popularity fallback
- **TC-FEED-001**: Blended feed default
- **TC-FEED-002**: Filter by event type
- **TC-FEED-003**: Filter by gig type
- **TC-FEED-004**: Pagination
- **TC-FEED-005**: New user empty state

## Manual checklist

- [ ] **TC-AUTH-003**: Non-OSU email rejected
- [ ] **TC-AUTH-007 / TC-AUTH-008**: Clerk sign-in on desktop and mobile
- [ ] **TC-ING-011**: External events visible in event list (no edit/delete controls)
- [ ] **TC-EMBED-009**: Semantic search manual verification (diverse events + natural language queries)
- [ ] **TC-FEED-006**: Recommendations page renders with filtering and pagination
