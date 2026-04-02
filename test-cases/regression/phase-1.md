# Phase 1 Regression Suite — Users & Events

Run this suite when the Phase 1 milestone is closed. Includes all Phase 0 regression.

## Automated

```sh
bun run test:regression:phase-1
```

### Included automated test cases

#### Phase 0 (re-run)

- TC-AUTH-001, TC-AUTH-002, TC-AUTH-004 through TC-AUTH-006, TC-AUTH-009, TC-AUTH-010

#### Phase 1 — User Profile API

- **TC-USER-001**: Get own profile
- **TC-USER-002**: Update display name
- **TC-USER-003**: Update interests
- **TC-USER-004**: Partial update preserves other fields
- **TC-USER-005**: Cannot update email via profile endpoint
- **TC-USER-006**: Profile edit form submits updated values
- **TC-USER-007**: Profile edit form discards unsaved changes on cancel
- **TC-USER-008**: PATCH /users/me rejects non-object JSON payloads

#### Phase 1 — Public Profile API

- **TC-PUB-001**: View another user's profile
- **TC-PUB-002**: Email not visible on public profile
- **TC-PUB-003**: Created events on profile (only OPEN/IN_PROGRESS)
- **TC-PUB-006**: User not found returns 404
- **TC-PUB-007**: Public profile page renders correctly
- **TC-PUB-008**: Non-numeric pagination params return 400

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
- **TC-EVT-021**: Invalid create payload rejected
- **TC-EVT-022**: Invalid update payload rejected
- **TC-EVT-023**: Invalid list filters rejected
- **TC-EVT-017**: Event creation form submits and navigates to detail
- **TC-EVT-019**: Creator-only actions on event detail surfaces

#### Phase 1 — Authorization

- **TC-AUTHZ-001**: Owner updates their event
- **TC-AUTHZ-002**: Non-owner cannot update event
- **TC-AUTHZ-003**: Non-owner cannot delete event

## Manual checklist

- [ ] **TC-AUTH-003**: Non-OSU email rejected
- [ ] **TC-AUTH-007**: Clerk sign-in UI renders on desktop
- [ ] **TC-AUTH-008**: Clerk sign-in UI renders on mobile
- [ ] App shell layout: header navigation renders correctly on desktop and mobile
- [ ] All pages return graceful error states for 404 / network failures
