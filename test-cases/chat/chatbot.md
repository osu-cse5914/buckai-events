# Chatbot Test Cases

Spec: [`chatbot`](../../specs/chat/chatbot.md)

---

## TC-CHAT-001: Search for events by keyword

- **Spec scenario**: S-CHAT-1
- **Type**: Automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A sends `"What music events are happening this weekend?"`
- **When**: The chatbot processes the message
- **Then**: It calls `searchEvents` with appropriate filters and returns structured event cards

## TC-CHAT-002: Search for gigs

- **Spec scenario**: S-CHAT-2
- **Type**: Automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A sends `"Find me a tutoring gig that pays at least $20/hr"`
- **When**: The chatbot processes the message
- **Then**: It calls `searchGigs` with query and compensation filter

## TC-CHAT-003: Mutation requires confirmation

- **Spec scenario**: S-CHAT-3
- **Type**: Automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A sends `"Apply me to that tutoring gig"`
- **When**: The chatbot determines the target gig
- **Then**: It responds with a confirmation message and waits before calling `applyToGig`

## TC-CHAT-004: User confirms mutation

- **Spec scenario**: S-CHAT-4
- **Type**: Automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: The chatbot proposed applying to gig G; user A confirms
- **When**: The chatbot receives the confirmation
- **Then**: It calls `applyToGig` and responds with success

## TC-CHAT-005: User cancels mutation

- **Spec scenario**: S-CHAT-5
- **Type**: Automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: The chatbot proposed applying to gig G; user A cancels
- **When**: The chatbot receives the cancellation
- **Then**: It does not call `applyToGig` and acknowledges the cancellation

## TC-CHAT-006: Off-topic question declined

- **Spec scenario**: S-CHAT-6
- **Type**: Automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A sends `"What's the weather like tomorrow?"`
- **When**: The chatbot processes the message
- **Then**: It declines politely and suggests asking about events or gigs

## TC-CHAT-007: Grounded in real data (no hallucination)

- **Spec scenario**: S-CHAT-7
- **Type**: Semi-automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A asks about events and no matching results exist
- **When**: The chatbot calls `searchEvents` and gets zero results
- **Then**: It responds honestly that no events were found (does not fabricate)

## TC-CHAT-008: Streamed response

- **Spec scenario**: S-CHAT-8
- **Type**: Automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A sends a message
- **When**: The chatbot generates a response
- **Then**: The response is streamed token-by-token via SSE

## TC-CHAT-009: LLM service unavailable

- **Spec scenario**: S-CHAT-9
- **Type**: Automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: The Gemini API is unavailable
- **When**: User A sends a message
- **Then**: API responds with error message; user's message is still stored; no assistant message stored

## TC-CHAT-010: Tool call returns empty results

- **Spec scenario**: S-CHAT-10
- **Type**: Automated
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A asks about events and `searchEvents` returns zero results
- **When**: The chatbot processes the message
- **Then**: It responds that no events were found; does not fabricate events

## TC-CHAT-011: Chat UI — conversation flow — Manual

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Steps**:
  1. Sign in, navigate to the chat page
  2. Start a new conversation
  3. Send a message asking about events
  4. Verify response streams in token-by-token
  5. Ask a follow-up question referencing previous context
  6. Verify the chatbot maintains context
- **Expected**: Conversation flows naturally with streaming responses and context retention

## TC-CHAT-012: Confirmation dialog for mutations — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Steps**:
  1. In a chat conversation, ask to apply to a gig or save an event
  2. Verify a confirmation dialog appears with action details
  3. Click "Confirm" and verify the action is executed
  4. Repeat and click "Cancel" and verify the action is not executed
- **Expected**: Confirmation flow works with clear action description and both confirm/cancel paths
