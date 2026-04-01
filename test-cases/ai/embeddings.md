# Embeddings & Vector Search Test Cases

Spec: [`embeddings`](../../specs/ai/embeddings.md)

---

## TC-EMBED-001: Embedding generated on event creation

- **Spec scenario**: S-EMBED-1
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A creates an event with title and description
- **When**: The event is saved
- **Then**: An EventEmbedding row is created with the embedding vector and textHash

## TC-EMBED-002: Embedding regenerated on content change

- **Spec scenario**: S-EMBED-2
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Event E has an embedding with textHash `"abc123"`
- **When**: User A updates the event's description, producing textHash `"def456"`
- **Then**: The embedding is regenerated with the new vector and hash

## TC-EMBED-003: Embedding not regenerated on non-content change

- **Spec scenario**: S-EMBED-3
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Event E has an embedding with textHash `"abc123"`
- **When**: User A updates event E's status from OPEN to IN_PROGRESS
- **Then**: The textHash is unchanged and the embedding is not regenerated

## TC-EMBED-004: Semantic search returns relevant results

- **Spec scenario**: S-EMBED-4
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Events exist: "Jazz Night", "Rock Concert", "Study Group for CS 101"
- **When**: Searching with query `"live music events"`
- **Then**: Jazz Night and Rock Concert rank highest; Study Group ranks lowest

## TC-EMBED-005: Semantic search combined with structured filter

- **Spec scenario**: S-EMBED-5
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Events exist in categories `"music"` and `"academic"`
- **When**: Searching with query `"something fun tonight"` and category = `"music"`
- **Then**: Only music events are returned, ranked by semantic similarity

## TC-EMBED-006: Embedding failure does not block event creation

- **Spec scenario**: S-EMBED-6
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The embedding model is unavailable
- **When**: User A creates an event
- **Then**: Event is created without an EventEmbedding row; still searchable via structured filters

## TC-EMBED-007: Backfill generates missing embeddings

- **Spec scenario**: S-EMBED-7
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: 10 events exist without EventEmbedding rows
- **When**: The backfill job runs
- **Then**: EventEmbedding rows are created for all 10 events

## TC-EMBED-008: Event deletion cascades to embedding

- **Spec scenario**: S-EMBED-8
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Event E has an EventEmbedding row
- **When**: Event E is deleted
- **Then**: The EventEmbedding row is also deleted (cascade)

## TC-EMBED-009: Semantic search — manual verification

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Steps**:
  1. Create 5+ events with diverse topics (music, sports, academic, social, tech)
  2. Use the search endpoint with natural language queries like "something fun outdoors"
  3. Verify that results are semantically relevant, not just keyword matches
- **Expected**: Results are ordered by relevance; unrelated events rank low or are excluded

## TC-EMBED-010: Embedding generation requests configured dimensions

- **Spec scenario**: S-EMBED-1
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The embedding task is configured with dimensions `768`
- **When**: The embedding service generates an event embedding
- **Then**: The provider request includes the configured dimensions before storage

## TC-EMBED-011: Embedding generation rejects mismatched vector lengths

- **Spec scenario**: S-EMBED-1
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: The embedding task is configured with dimensions `768`
- **When**: The provider returns a vector with a different length
- **Then**: The embedding service fails before writing an invalid vector to the database
