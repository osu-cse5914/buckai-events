# Recommendation Feed Test Cases

Spec: [`feed`](../../specs/recommendations/feed.md)

Status: Planned. `GET /recommendations` is not mounted in the current shipped API, so these cases are not part of the active regression suite yet.

---

## TC-FEED-001: Blended feed default

- **Spec scenario**: S-FEED-1
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A has interactions with both events and gigs
- **When**: User A sends `GET /recommendations`
- **Then**: The response contains a mix of events and gigs ordered by recommendation score

## TC-FEED-002: Filter by event type

- **Spec scenario**: S-FEED-2
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A sends `GET /recommendations?type=EVENT`
- **Then**: The response contains only items with type EVENT

## TC-FEED-003: Filter by gig type

- **Spec scenario**: S-FEED-3
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A sends `GET /recommendations?type=GIG`
- **Then**: The response contains only items with type GIG

## TC-FEED-004: Pagination

- **Spec scenario**: S-FEED-4
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A has 50 recommended items
- **When**: User A sends `GET /recommendations?limit=10&offset=20`
- **Then**: The response contains items 21–30 and meta.total is 50

## TC-FEED-005: New user empty state

- **Spec scenario**: S-FEED-5
- **Type**: Automated
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A has no interactions and no interests
- **When**: User A sends `GET /recommendations`
- **Then**: Events are sorted by popularity then recency

## TC-FEED-006: Recommendations page — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Steps**:
  1. Sign in as a user with interests set
  2. Navigate to the recommendations/home page
  3. Verify the page renders the `Recommended`, `Popular`, and `Upcoming` sections
  4. Verify the `Recommended` section appears in a personalized order
  5. Toggle between "All", "Events", and "Gigs" filters
  6. Verify all three sections update with the active filter
  7. Use `Load more` in the `Recommended` section only
- **Expected**: The sectioned Featured page renders correctly, filtering applies across all sections, and only the `Recommended` section paginates

## TC-FEED-007: Popular recommendations endpoint ordering

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/recommendations.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A requests `GET /api/v1/recommendations/popular`
- **Then**: Eligible items are ordered by popularity, then nearer upcoming time, then stable id

## TC-FEED-008: Upcoming recommendations endpoint ordering

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/recommendations.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A requests `GET /api/v1/recommendations/upcoming`
- **Then**: Eligible items are ordered by soonest upcoming time, then popularity, then stable id

## TC-FEED-009: Section endpoints respect type filters

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/recommendations.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A requests the `popular` or `upcoming` section with `type=EVENT` or `type=GIG`
- **Then**: The section response contains only items of the requested type

## TC-FEED-010: Section endpoints exclude dismissed and ineligible items

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/recommendations.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A has dismissed an item and some items are past or closed
- **Then**: `popular` and `upcoming` exclude dismissed, past, and non-open/non-in-progress items

## TC-FEED-011: Featured page renders the sectioned layout

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/featured/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The recommendations section queries succeed
- **Then**: The page renders `Recommended`, `Popular`, and `Upcoming` sections with the shared Featured framing

## TC-FEED-012: Featured filter updates all sections

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/featured/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The user changes the Featured type filter
- **Then**: `Recommended`, `Popular`, and `Upcoming` refetch using the active type

## TC-FEED-013: Featured fallback banner is scoped to recommendations

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/featured/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The personalized section reports `POPULARITY_FALLBACK`
- **Then**: The page shows the fallback banner without requiring `Popular` or `Upcoming` metadata

## TC-FEED-014: Featured load more paginates only recommended results

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/featured/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The `Recommended` section has another page
- **Then**: `Load more` appends only `Recommended` items and does not page `Popular` or `Upcoming`

## TC-FEED-015: Featured sections handle partial empty and error states

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/featured/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: One section errors or returns no items while others succeed
- **Then**: The page keeps rendering the remaining sections and shows a safe section-level empty or error state
