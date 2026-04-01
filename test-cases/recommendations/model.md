# Recommendation Model Test Cases

Spec: [`model`](../../specs/recommendations/model.md)

Status: Planned. `GET /recommendations` is not mounted in the current shipped API, so these model-ranking cases are not part of the active regression suite yet.

---

## TC-REC-MODEL-001: Interest-based boost

- **Spec scenario**: S-REC-MODEL-1
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A has interests `["music", "tech"]`
- **When**: User A sends `GET /recommendations`
- **Then**: Events with category `"music"` or `"tech"` appear higher in the list

## TC-REC-MODEL-002: Popularity ranking

- **Spec scenario**: S-REC-MODEL-2
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Event E has 50 interactions and event F has 5, both matching user A's interests equally
- **When**: User A sends `GET /recommendations`
- **Then**: Event E ranks higher than event F

## TC-REC-MODEL-003: Recency ranking

- **Spec scenario**: S-REC-MODEL-3
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Event A starts tomorrow and event B starts in 30 days, equal popularity and interest
- **When**: User sends `GET /recommendations`
- **Then**: Event A ranks higher than event B

## TC-REC-MODEL-004: Dismissed events excluded

- **Spec scenario**: S-REC-MODEL-4
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A dismissed event E
- **When**: User A sends `GET /recommendations`
- **Then**: Event E does not appear in the results

## TC-REC-MODEL-005: Past events excluded

- **Spec scenario**: S-REC-MODEL-5
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: Event E has startAt in the past and status COMPLETED
- **When**: User A sends `GET /recommendations`
- **Then**: Event E is not in the results

## TC-REC-MODEL-006: No interests, no interactions — popularity fallback

- **Spec scenario**: S-REC-MODEL-6
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A has no interests and no interactions
- **When**: User A sends `GET /recommendations`
- **Then**: Events are sorted by popularity then recency
