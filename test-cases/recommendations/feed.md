# Recommendation Feed Test Cases

Spec: [`feed`](../../specs/recommendations/feed.md)

Status: Planned. `GET /recommendations` is not mounted in the current shipped API, so these cases are not part of the active regression suite yet.

---

## TC-FEED-001: Blended feed default

- **Spec scenario**: S-FEED-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/recommendations.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A has interactions with both events and gigs
- **When**: User A sends `GET /recommendations`
- **Then**: The response contains a mix of events and gigs ordered by recommendation score

## TC-FEED-002: Filter by event type

- **Spec scenario**: S-FEED-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/recommendations.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A sends `GET /recommendations?type=EVENT`
- **Then**: The response contains only items with type EVENT

## TC-FEED-003: Filter by gig type

- **Spec scenario**: S-FEED-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/recommendations.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A sends `GET /recommendations?type=GIG`
- **Then**: The response contains only items with type GIG

## TC-FEED-004: Pagination

- **Spec scenario**: S-FEED-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/recommendations.test.ts`
- **Phase introduced**: 4
- **Regression**: Phase 4+
- **Given**: User A has 50 recommended items
- **When**: User A sends `GET /recommendations?limit=10&offset=20`
- **Then**: The response contains items 21–30 and meta.total is 50

## TC-FEED-005: New user empty state

- **Spec scenario**: S-FEED-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/recommendations.test.ts`
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
  3. Verify the page renders a secondary Featured tab bar with `Recommended`, `Following`, `Popular`, and `Upcoming`
  4. Verify the `Recommended` section appears in a personalized order
  5. Switch tabs and verify each tab shows only its own lane content
  6. Toggle between "All", "Events", and "Gigs" filters
  7. Verify recommendation tabs update with the active filter
  8. Use `Load more` in the `Recommended` tab only
- **Expected**: The tabbed Featured page renders correctly, recommendation tabs update for the selected type filter, and only the `Recommended` tab paginates

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

## TC-FEED-011: Featured page renders the tabbed layout

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/featured/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The Featured recommendation and social queries succeed
- **Then**: The page renders a Featured secondary tab bar with `Recommended`, `Following`, `Popular`, and `Upcoming`
- **And**: The default active tab is `Recommended`

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

## TC-FEED-015: Featured tabs handle partial empty and error states

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/featured/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: One recommendation tab errors or returns no items while others succeed
- **Then**: The page keeps rendering healthy tabs and shows a safe tab-level empty or error state

## TC-FEED-016: Featured discovery omits the keyword search field

- **Spec scenario**: S-FEED-12
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/featured/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A user opens the Featured page
- **Then**: The page does not render a keyword search field and remains focused on discovery modules and feed filters
