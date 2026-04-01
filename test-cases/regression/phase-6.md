# Phase 6 Regression Suite — Polish & Integration (Full Regression)

Run this suite when the Phase 6 milestone is closed. This is the **full regression** — all phases.

## Automated

```sh
bun run test:regression:phase-6
```

### Included automated test cases

All automated cases from Phase 0 through Phase 5, plus:

- **TC-API-001**: Unknown API route returns RFC 7807 not-found response
- **TC-API-002**: Uncaught handler error returns RFC 7807 internal-error response
- **TC-API-003**: Versioned API routes can mount under a parent prefix
- **TC-FEED-007**: Popular recommendations endpoint ordering
- **TC-FEED-008**: Upcoming recommendations endpoint ordering
- **TC-FEED-009**: Section endpoints respect type filters
- **TC-FEED-010**: Section endpoints exclude dismissed and ineligible items
- **TC-FEED-011**: Featured page renders the sectioned layout
- **TC-FEED-012**: Featured filter updates all sections
- **TC-FEED-013**: Featured fallback banner is scoped to recommendations
- **TC-FEED-014**: Featured load more paginates only recommended results
- **TC-FEED-015**: Featured sections handle partial empty and error states

## Manual checklist — Full system

### Authentication & Authorization

- [ ] **TC-AUTH-003**: Non-OSU email rejected
- [ ] **TC-AUTH-007**: Clerk sign-in UI on desktop
- [ ] **TC-AUTH-008**: Clerk sign-in UI on mobile

### User Profile

- [ ] **TC-USER-006**: Profile edit form saves and persists
- [ ] **TC-USER-007**: Profile edit preserves data on navigation
- [ ] **TC-PUB-007**: Public profile page renders correctly

### Events

- [ ] **TC-EVT-017**: Event creation form validates and submits
- [ ] **TC-EVT-018**: Event list pagination with browser back button
- [ ] **TC-EVT-019**: Creator-only actions on event detail page

### Gig Applications

- [ ] **TC-APP-010**: Apply button on gig detail page
- [ ] **TC-APP-011**: "My Applications" view
- [ ] **TC-APP-012**: "Manage Applications" view

### Collections

- [ ] **TC-COL-011**: "Save to Collection" button
- [ ] **TC-COL-012**: Collections page CRUD

### Social

- [ ] **TC-FOL-008**: Follow/unfollow button toggles
- [ ] **TC-FOL-009**: Followers/following lists
- [ ] **TC-SFEED-010**: Social feed page

### AI & External Data

- [ ] **TC-ING-011**: External events visible in event list
- [ ] **TC-EMBED-009**: Semantic search manual verification
- [ ] **TC-FEED-006**: Recommendations page

### Chatbot

- [ ] **TC-CHAT-007**: Chatbot grounded in real data
- [ ] **TC-CHAT-011**: Chat UI conversation flow
- [ ] **TC-CHAT-012**: Confirmation dialog for mutations
- [ ] **TC-CONV-009**: Conversation list sidebar

### Phase 6 — Polish-specific

- [ ] RFC 7807 Problem Details: verify error responses across 5+ endpoints
- [ ] Loading states: verify spinners/skeletons appear during data fetches
- [ ] Empty states: verify helpful messages when lists are empty
- [ ] Error states: verify user-friendly errors on network failure
- [ ] Responsive design: test all pages at 375px, 768px, 1280px, 1920px viewports
- [ ] End-to-end smoke: sign up → create event → apply to gig → save to collection → follow user → social feed → chatbot → confirm mutation (one continuous flow)
