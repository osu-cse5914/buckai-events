# Phase 1 Regression Suite — Users & Events

Run this suite when the Phase 1 milestone is closed. Includes all Phase 0 regression.

## Automated

```sh
bun run test:regression:phase-1
```

### Included automated test cases

#### Phase 0 (re-run)

- TC-AUTH-001 through TC-AUTH-006, TC-AUTH-009

#### Phase 1 — User Profile API

- **TC-USER-001**: Get own profile
- **TC-USER-002**: Update display name
- **TC-USER-003**: Update interests
- **TC-USER-004**: Partial update preserves other fields
- **TC-USER-005**: Cannot update email via profile endpoint

#### Phase 1 — Public Profile API

- **TC-PUB-001**: View another user's profile
- **TC-PUB-002**: Email not visible on public profile
- **TC-PUB-003**: Created events on profile (only OPEN/IN_PROGRESS)
- **TC-PUB-006**: User not found returns 404

#### Phase 1 — Event CRUD API

- **TC-EVT-001**: Create an event
- **TC-EVT-002**: Create a gig
- **TC-EVT-003**: Read single event
- **TC-EVT-004**: List events with filters
- **TC-EVT-005**: Update own event
- **TC-EVT-006**: Delete own event
- **TC-EVT-008**: Cancel an event
- **TC-EVT-009**: Manual completion
- **TC-EVT-010**: Auto-completion after endAt
- **TC-EVT-011**: No auto-completion without endAt
- **TC-EVT-020**: Invalid status transition rejected

#### Phase 1 — Authorization

- **TC-AUTHZ-001**: Owner updates their event
- **TC-AUTHZ-002**: Non-owner cannot update event
- **TC-AUTHZ-003**: Non-owner cannot delete event

## Manual checklist

- [ ] **TC-AUTH-003**: Non-OSU email rejected
- [ ] **TC-AUTH-007**: Clerk sign-in UI renders on desktop
- [ ] **TC-AUTH-008**: Clerk sign-in UI renders on mobile
- [ ] **TC-USER-006**: Profile edit form saves and persists after refresh
- [ ] **TC-USER-007**: Profile edit form preserves data on navigation
- [ ] **TC-PUB-007**: Public profile page renders correctly
- [ ] **TC-EVT-017**: Event creation form validates and submits correctly
- [ ] **TC-EVT-018**: Event list pagination works with browser back button
- [ ] **TC-EVT-019**: Event detail page shows creator-only actions appropriately
- [ ] App shell layout: header navigation renders correctly on desktop and mobile
- [ ] All pages return graceful error states for 404 / network failures
