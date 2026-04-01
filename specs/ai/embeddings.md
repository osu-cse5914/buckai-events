# Embeddings & Vector Search

## Overview

Events are represented as vector embeddings for semantic search. The chatbot uses vector similarity to find events that match natural-language queries, going beyond keyword and structured filter matching. Embeddings are stored in PostgreSQL using the `pgvector` extension on Neon.

## Architecture

```
Event created/updated
        │
        ▼
AI Model Router (task: "embedding")
        │
        ▼
Embedding model generates vector
        │
        ▼
Stored in EventEmbedding table (pgvector)

        ───────────────────────────────

User query (via chatbot or search)
        │
        ▼
AI Model Router (task: "embedding")
        │
        ▼
Query text → query vector
        │
        ▼
pgvector cosine similarity search
        │
        ▼
Top-N matching events returned
```

## Data Model

### EventEmbedding

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid | |
| eventId | String | FK → Event, ON DELETE CASCADE, unique | One embedding per event |
| embedding | vector(768) | not null | pgvector column. Dimensions match the embedding model config |
| textHash | String | not null | Hash of the source text used to generate the embedding. Used to detect staleness |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | auto | |

The `textHash` is a hash of `title + description + category + tags.join(',')`. If the hash changes, the embedding is stale and must be regenerated.

### pgvector Index

A HNSW (Hierarchical Navigable Small World) index is created on the `embedding` column for fast approximate nearest neighbor queries:

```sql
CREATE INDEX event_embedding_idx ON "EventEmbedding"
USING hnsw (embedding vector_cosine_ops);
```

## Embedding Generation

### On Event Creation

When an event is created (user-created or external ingestion), the system generates an embedding from the event's text content and stores it in `EventEmbedding`. The source text is: `"{title}. {description}. Category: {category}. Tags: {tags.join(', ')}"`.

If the AI service is unavailable, the event is created without an embedding. A background job retries failed embeddings.

### On Event Update

When an event's title, description, category, or tags change, the system recomputes the `textHash`. If the hash differs from the stored hash, a new embedding is generated and the row is updated.

### External Event Ingestion

External events receive embeddings on initial ingestion. On subsequent syncs, embeddings are regenerated only if the textHash changes (i.e., the content actually changed).

### Batch Backfill

A CLI command or cron job can generate embeddings for events that have no `EventEmbedding` row (e.g., after initial deployment or if embedding generation failed).

## Semantic Search

### Query Flow

1. The caller provides a natural-language query string.
2. The model router generates a query embedding using the `embedding` task.
3. pgvector performs a cosine similarity search against `EventEmbedding`.
4. Results are filtered by event status (OPEN, IN_PROGRESS) and startAt (future).
5. Top-N events are returned, ordered by similarity score descending.

### API Surface

The backend exposes semantic search at `GET /api/v1/events/semantic-search`.

- `query` is required.
- `limit` defaults to `10` and is capped at `25`.
- `type`, `category`, `startDate`, and `endDate` are optional structured
  filters applied alongside vector similarity.
- The response is a bare JSON array of matching events with an added
  `similarity` score.

### Hybrid Search

Semantic search can be combined with structured filters. For example, the chatbot might search semantically within a category or date range:

```sql
SELECT e.*, 1 - (ee.embedding <=> $queryVector) AS similarity
FROM "Event" e
JOIN "EventEmbedding" ee ON ee."eventId" = e.id
WHERE e.status IN ('OPEN', 'IN_PROGRESS')
  AND e."startAt" > NOW()
  AND e.category = $category   -- optional structured filter
ORDER BY similarity DESC
LIMIT $limit;
```

### Integration with Chatbot Tools

The chatbot's `searchEvents` and `searchGigs` tools use semantic search when a free-text `query` parameter is provided. If only structured filters are provided (category, date range), standard SQL filtering is used without embeddings.

### Public Search Endpoint

The authenticated app also exposes semantic search through `GET /api/v1/events/semantic-search`.

- Query params: `query`, `type?`, `category?`, `startDate?`, `endDate?`, `limit`, `offset`
- Eligibility filters remain the same as chatbot semantic search: only future `OPEN` and `IN_PROGRESS` events
- The public response follows the same `{ data, pagination }` envelope used by `GET /api/v1/events`
- Similarity scores remain internal and are not exposed in the Search page response contract

## Scenarios

### S-EMBED-1: Embedding generated on event creation

```
GIVEN user A creates an event with title "Jazz Night" and description "Live jazz at the Union"
WHEN the event is saved
THEN an EventEmbedding row is created with the event's embedding vector
AND textHash is computed from the event's text content
```

### S-EMBED-2: Embedding regenerated on content change

```
GIVEN event E has an embedding with textHash "abc123"
WHEN user A updates event E's description
AND the new textHash is "def456"
THEN the embedding is regenerated
AND the EventEmbedding row is updated with the new vector and hash
```

### S-EMBED-3: Embedding not regenerated on non-content change

```
GIVEN event E has an embedding with textHash "abc123"
WHEN user A updates event E's status from OPEN to IN_PROGRESS
THEN the textHash is unchanged
AND the embedding is not regenerated
```

### S-EMBED-4: Semantic search returns relevant results

```
GIVEN events exist: "Jazz Night at the Union", "Rock Concert at Newport", "Study Group for CS 101"
WHEN the chatbot searches with query "live music events"
THEN "Jazz Night at the Union" and "Rock Concert at Newport" rank highest by similarity
AND "Study Group for CS 101" ranks lowest
```

### S-EMBED-5: Semantic search combined with structured filter

```
GIVEN events exist in categories "music" and "academic"
WHEN the chatbot searches with query "something fun tonight" and category = "music"
THEN only music events are returned, ranked by semantic similarity
```

### S-EMBED-6: Embedding failure does not block event creation

```
GIVEN the embedding model is unavailable
WHEN user A creates an event
THEN the event is created without an EventEmbedding row
AND the event is still searchable via structured filters (keyword, category, date)
```

### S-EMBED-7: Backfill generates missing embeddings

```
GIVEN 10 events exist without EventEmbedding rows
WHEN the backfill job runs
THEN EventEmbedding rows are created for all 10 events
```

### S-EMBED-8: Event deletion cascades to embedding

```
GIVEN event E has an EventEmbedding row
WHEN event E is deleted
THEN the EventEmbedding row is also deleted (ON DELETE CASCADE)
```

### S-EMBED-9: Public semantic search uses the standard event pagination envelope

```
GIVEN semantic search finds matching future events
WHEN a client calls GET /events/semantic-search with query, limit, and offset
THEN the response uses the same { data, pagination } shape as GET /events
AND the results remain ordered by semantic similarity
```

### S-EMBED-10: Public semantic search preserves total count across pages

```
GIVEN semantic search finds more matches than fit on one page
WHEN a client requests a later page using offset
THEN the response returns only that page of events
AND pagination.total still reflects the full semantic match count
```

## Test Cases

See [`test-cases/ai/embeddings.md`](../../test-cases/ai/embeddings.md) for the full test case registry (TC-EMBED-001 through TC-EMBED-013), including automated generation/search tests, public pagination coverage, and manual semantic search verification.
