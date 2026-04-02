# Phase 3 Regression Suite — Social

Run this suite when the Phase 3 milestone is closed. Includes all Phase 0 + 1 + 2 regression.

## Automated

```sh
bun run test:regression:phase-3
```

### Included automated test cases

#### Phase 0 + 1 + 2 (re-run)

All automated cases from prior regression suites.

#### Phase 3 — Follows

- **TC-FOL-001**: Follow a user
- **TC-FOL-002**: Cannot follow yourself
- **TC-FOL-003**: Cannot follow twice
- **TC-FOL-004**: Unfollow a user
- **TC-FOL-005**: Unfollow when not following
- **TC-FOL-006**: List followers
- **TC-FOL-007**: List following

#### Phase 3 — Social Feed

- **TC-SFEED-001**: See events created by followed users
- **TC-SFEED-002**: See events saved by followed users
- **TC-SFEED-003**: Private collection saves not in feed
- **TC-SFEED-004**: Feed ordering by action timestamp
- **TC-SFEED-005**: Empty feed
- **TC-SFEED-006**: Pagination
- **TC-SFEED-007**: Unfollowed user's events disappear
- **TC-SFEED-008**: Dedup — same event created and saved appears once
- **TC-SFEED-009**: Dedup — same event in multiple public collections
- **TC-SFEED-011**: Social page appears in primary navigation
- **TC-SFEED-012**: Social feed page renders items from the API
- **TC-SFEED-013**: Social feed page supports loading more items
- **TC-SFEED-014**: Social feed page shows an empty state with follow guidance

#### Phase 3 — Public Profile (newly testable)

- **TC-PUB-004**: isFollowing is true
- **TC-PUB-005**: isFollowing is false

## Manual checklist

- [ ] **TC-AUTH-003**: Non-OSU email rejected
- [ ] **TC-AUTH-007 / TC-AUTH-008**: Clerk sign-in on desktop and mobile
