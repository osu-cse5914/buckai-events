# Recommendation Feed Test Cases

Spec: [`feed`](../../specs/recommendations/feed.md)

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
  3. Verify events appear in a personalized order
  4. Toggle between "All", "Events", and "Gigs" filters
  5. Scroll to trigger pagination
- **Expected**: Feed renders correctly with filtering and pagination; personalized order is visible
