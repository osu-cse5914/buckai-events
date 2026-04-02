# Phase 5 Regression Suite — Chatbot

Run this suite when the Phase 5 milestone is closed. Includes all Phase 0–4 regression.

## Automated

```sh
bun run test:regression:phase-5
```

### Included automated test cases

#### Phase 0–4 (re-run)

All automated cases from prior regression suites.

#### Phase 5 — Conversations

- **TC-CONV-001**: Create a conversation
- **TC-CONV-002**: List conversations
- **TC-CONV-003**: Send first message and auto-title
- **TC-CONV-004**: Get message history
- **TC-CONV-005**: Cannot access another user's conversation
- **TC-CONV-006**: Conversation context window (last N messages)
- **TC-CONV-007**: Title generation failure
- **TC-CONV-008**: Title does not change after first message

#### Phase 5 — Chatbot

- **TC-CHAT-001**: Search for events by keyword
- **TC-CHAT-002**: Search for gigs
- **TC-CHAT-003**: Mutation requires confirmation
- **TC-CHAT-004**: User confirms mutation
- **TC-CHAT-005**: User cancels mutation
- **TC-CHAT-006**: Off-topic question declined
- **TC-CHAT-008**: Streamed response
- **TC-CHAT-009**: LLM service unavailable
- **TC-CHAT-010**: Tool call returns empty results

#### Phase 5 — Authorization (newly testable)

- **TC-AUTHZ-012**: Cannot access another user's conversation

## Manual checklist

- [ ] **TC-AUTH-003**: Non-OSU email rejected
- [ ] **TC-AUTH-007 / TC-AUTH-008**: Clerk sign-in on desktop and mobile
- [ ] **TC-ING-011**: External events visible
- [ ] **TC-EMBED-009**: Semantic search manual verification
- [ ] **TC-FEED-006**: Recommendations page
- [ ] **TC-CHAT-007**: Chatbot grounded in real data (no hallucination on empty results)
- [ ] **TC-CHAT-011**: Chat UI conversation flow (streaming, context retention, follow-up)
- [ ] **TC-CHAT-012**: Confirmation dialog for mutations (confirm and cancel paths)
- [ ] **TC-CONV-009**: Conversation list sidebar renders and switches correctly
