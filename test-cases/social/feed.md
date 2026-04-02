# Social Feed Test Cases

Spec: [`feed`](../../specs/social/feed.md)

---

## TC-SFEED-001: See events created by followed users

- **Spec scenario**: S-SFEED-1
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows user B, who created event E
- **When**: User A sends `GET /api/v1/social/feed`
- **Then**: The feed contains event E with action `"created"` and actor = user B

## TC-SFEED-002: See events saved by followed users

- **Spec scenario**: S-SFEED-2
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows user B, who saved event E to a PUBLIC collection
- **When**: User A sends `GET /api/v1/social/feed`
- **Then**: The feed contains event E with action `"saved"` and actor = user B

## TC-SFEED-003: Private collection saves not in feed

- **Spec scenario**: S-SFEED-3
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows user B, who saved event E to a PRIVATE collection
- **When**: User A sends `GET /api/v1/social/feed`
- **Then**: Event E does not appear in the feed

## TC-SFEED-004: Feed ordering by action timestamp

- **Spec scenario**: S-SFEED-4
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows users B and C; B created E1 at T1, C saved E2 at T2 (T2 > T1)
- **When**: User A sends `GET /api/v1/social/feed`
- **Then**: E2 appears before E1

## TC-SFEED-005: Empty feed

- **Spec scenario**: S-SFEED-5
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows nobody
- **When**: User A sends `GET /api/v1/social/feed`
- **Then**: The response contains an empty data array

## TC-SFEED-006: Pagination

- **Spec scenario**: S-SFEED-6
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A's social feed has 50 items
- **When**: User A sends `GET /api/v1/social/feed?limit=10&offset=10`
- **Then**: The response contains items 11–20 and meta.total is 50

## TC-SFEED-007: Unfollowed user's events disappear

- **Spec scenario**: S-SFEED-7
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows user B and sees user B's events in the feed
- **When**: User A unfollows user B
- **Then**: User B's events no longer appear in user A's social feed

## TC-SFEED-008: Dedup — same event created and saved appears once

- **Spec scenario**: S-SFEED-8
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows user B; B created event E and also saved it to a PUBLIC collection
- **When**: User A sends `GET /api/v1/social/feed`
- **Then**: Event E appears once with action `"created"` (creation takes precedence)

## TC-SFEED-009: Dedup — same event in multiple public collections

- **Spec scenario**: S-SFEED-9
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows user B; B saved event E to two PUBLIC collections
- **When**: User A sends `GET /api/v1/social/feed`
- **Then**: Event E appears once with most recent save timestamp

## TC-SFEED-010: Social feed page — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 3
- **Regression**: Always
- **Steps**:
  1. Sign in, ensure you follow at least 2 users who have created or saved events
  2. Navigate to the social feed page
  3. Verify events show actor name and action type (created/saved)
  4. Scroll to trigger pagination
- **Expected**: Feed shows events from followed users in reverse chronological order with correct attribution

## TC-SFEED-011: Social page appears in primary navigation

- **Spec scenario**: —
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: The authenticated app shell is rendered
- **When**: The primary navigation model is inspected
- **Then**: It includes a Social destination

## TC-SFEED-012: Social feed page renders items from the API

- **Spec scenario**: S-SFEED-1, S-SFEED-2, S-SFEED-4
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: The social feed API returns feed items
- **When**: The authenticated user opens the social feed page
- **Then**: The page shows actor name, action type, and event title in API order

## TC-SFEED-013: Social feed page supports loading more items

- **Spec scenario**: S-SFEED-6
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: The social feed API has more items than the initial page
- **When**: The user loads more items
- **Then**: The next page is appended and the item count increases

## TC-SFEED-014: Social feed page shows an empty state with follow guidance

- **Spec scenario**: S-SFEED-5
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: The social feed API returns no items
- **When**: The authenticated user opens the social feed page
- **Then**: The page shows an empty-state message and follow guidance based on profile context
