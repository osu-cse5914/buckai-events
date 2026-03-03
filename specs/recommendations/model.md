# Recommendation Model [WIP]

> **Status**: This spec is a work-in-progress. The custom model architecture, scoring pipeline, training cycle, and embedding-based approach will be designed in a later phase. The current implementation uses a simple interim ranking (see below) to unblock the feed endpoint and UI.

## Overview

The recommendation model provides personalized ranking of events and gigs for each user. It operates independently from the LLM chatbot. The final model will be a purpose-built system trained on platform-specific signals.

## Interim Ranking (Current Phase)

Until the custom model is designed, `GET /recommendations` uses a simple heuristic ranking:

1. **Candidate selection**: Events with status OPEN or IN_PROGRESS and startAt in the future.
2. **Interest matching**: Events whose category matches any of the user's interests are boosted.
3. **Popularity**: Events with more total interactions rank higher.
4. **Recency**: Events starting sooner rank higher.
5. **Dismiss penalty**: Events the user has dismissed are excluded.

This is a deterministic query-time sort — no model training, no vectors, no caching layer. It is implemented as a database query with ORDER BY clauses.

## Input Signals (interim)

| Signal | Source | Used in interim? |
|--------|--------|-----------------|
| User interests | `User.interests` | Yes — category match boost |
| Interaction history | `Interaction` table | Partial — dismiss exclusion only |
| Event recency | `Event.startAt` | Yes |
| Event popularity | Aggregate interaction count | Yes |
| Category affinity | Frequency of interactions per category | No — deferred to custom model |
| Geographic proximity | User location vs. event lat/lng | No — deferred to custom model |
| Embeddings / semantic similarity | Event embeddings via pgvector | No — deferred to custom model |
| Collaborative filtering | User-event matrix | No — deferred to custom model |

## Future Model Direction

The custom model phase will evaluate:

- **Embedding-based content scoring**: Represent events as embeddings (via the AI module's embedding task) and compute semantic similarity against user profile embeddings. Replaces manual feature vectors.
- **Collaborative filtering**: User-event interaction matrix with matrix factorization.
- **Hybrid approach**: Content-based as primary ranker, collaborative as boost signal.
- **Training/update cycle**: Nightly retraining for collaborative; real-time embedding updates for content.
- **Caching**: Per-user cache with TTL and invalidation on interaction/interest change.

These details will be spec'd when the model is designed.

## Scenarios (interim ranking)

### S-REC-MODEL-1: Interest-based boost

```
GIVEN user A has interests ["music", "tech"]
WHEN user A sends GET /recommendations
THEN events with category "music" or "tech" appear higher in the list
```

### S-REC-MODEL-2: Popularity ranking

```
GIVEN event E has 50 total interactions and event F has 5
AND both match user A's interests equally
WHEN user A sends GET /recommendations
THEN event E ranks higher than event F
```

### S-REC-MODEL-3: Recency ranking

```
GIVEN event A starts tomorrow and event B starts in 30 days
AND both have equal popularity and interest match
WHEN user A sends GET /recommendations
THEN event A ranks higher than event B
```

### S-REC-MODEL-4: Dismissed events excluded

```
GIVEN user A dismissed event E
WHEN user A sends GET /recommendations
THEN event E does not appear in the results
```

### S-REC-MODEL-5: Past events excluded

```
GIVEN event E has startAt in the past and status COMPLETED
WHEN user A sends GET /recommendations
THEN event E is not in the results
```

### S-REC-MODEL-6: No interests, no interactions — popularity fallback

```
GIVEN user A has no interests and no interactions
WHEN user A sends GET /recommendations
THEN events are sorted by popularity (interaction count) then recency
```
