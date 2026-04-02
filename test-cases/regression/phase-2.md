# Phase 2 Regression Suite — Marketplace

Run this suite when the Phase 2 milestone is closed. Includes all Phase 0 + 1 regression.

## Automated

```sh
bun run test:regression:phase-2
```

### Included automated test cases

#### Phase 0 + 1 (re-run)

All automated cases from Phase 0 and Phase 1 regression suites.

#### Phase 2 — Gig Applications

- **TC-APP-001**: Apply to a gig
- **TC-APP-002**: Cannot apply to own gig
- **TC-APP-003**: Cannot apply twice
- **TC-APP-004**: Accept an application
- **TC-APP-005**: Reject an application
- **TC-APP-006**: Accept multiple applicants
- **TC-APP-007**: Cannot apply to non-gig event
- **TC-APP-008**: Cannot apply to cancelled gig
- **TC-APP-009**: Cannot change status of non-PENDING application
- **TC-APP-010**: Gig detail apply flow works end-to-end
- **TC-APP-011**: My Applications page lists submitted gigs with statuses
- **TC-APP-012**: Manage Applications page updates applicant statuses

#### Phase 2 — Collections

- **TC-COL-001**: Create a collection
- **TC-COL-002**: Create a public collection
- **TC-COL-003**: Add event to collection
- **TC-COL-004**: Cannot add duplicate event
- **TC-COL-005**: Remove event from collection
- **TC-COL-006**: List own collections
- **TC-COL-007**: View public collection as another user
- **TC-COL-008**: Cannot view private collection of another user
- **TC-COL-009**: Change collection visibility
- **TC-COL-010**: Delete collection cascades to items

#### Phase 2 — Interactions

- **TC-INT-001**: Record a view
- **TC-INT-002**: Record a dismiss
- **TC-INT-003**: Multiple views recorded separately
- **TC-INT-004**: Interaction with nonexistent event

#### Phase 2 — Authorization (newly testable)

- **TC-AUTHZ-004**: Gig owner cannot apply to own gig
- **TC-AUTHZ-005**: Gig owner views all applications
- **TC-AUTHZ-006**: Non-owner cannot view gig applications
- **TC-AUTHZ-007**: Applicant views own application only
- **TC-AUTHZ-008**: Only gig owner updates application status
- **TC-AUTHZ-009**: Public collection visible to others
- **TC-AUTHZ-010**: Private collection hidden from others
- **TC-AUTHZ-011**: Non-owner cannot modify another user's collection

#### Phase 2 — Event cascade (newly testable)

- **TC-EVT-014**: Delete event cascades (applications, interactions, collection items)
- **TC-EVT-016**: Update gig after applications exist

## Manual checklist

- [ ] **TC-AUTH-003**: Non-OSU email rejected
- [ ] **TC-AUTH-007**: Clerk sign-in UI renders on desktop
- [ ] **TC-AUTH-008**: Clerk sign-in UI renders on mobile
