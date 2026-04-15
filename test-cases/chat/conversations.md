# Conversations Test Cases

Spec: [`conversations`](../../specs/chat/conversations.md)

## TC-CONV-001: Create a conversation

- **Spec scenario**: S-CONV-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/conversations.test.ts`
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A is authenticated
- **When**: User A sends `POST /conversations`
- **Then**: A Conversation is created with userId = user A, title = null

## TC-CONV-002: List conversations

- **Spec scenario**: S-CONV-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/conversations.test.ts`
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A has 3 conversations with different updatedAt values
- **When**: User A sends `GET /conversations`
- **Then**: The response contains conversations ordered by updatedAt descending

## TC-CONV-003: Send first message and auto-title

- **Spec scenario**: S-CONV-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/chatbot.test.ts`
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: User A has conversation C with no messages
- **When**: User A sends `POST /conversations/C/messages` with content
- **Then**: A USER message is created, LLM response is streamed, ASSISTANT message is stored, and title is auto-generated

## TC-CONV-004: Get message history

- **Spec scenario**: S-CONV-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/conversations.test.ts`
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: Conversation C has 5 messages
- **When**: User A sends `GET /conversations/C/messages`
- **Then**: The response contains 5 messages ordered by createdAt ascending

## TC-CONV-005: Cannot access another user's conversation

- **Spec scenario**: S-CONV-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/conversations.test.ts`
- **Phase introduced**: 5
- **Regression**: Always
- **Given**: User A owns conversation C
- **When**: User B sends `GET /conversations/C/messages`
- **Then**: The API responds with 404 Not Found

## TC-CONV-006: Conversation context window (last N messages)

- **Spec scenario**: S-CONV-6
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/chatbot.test.ts`
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: Conversation C has 30 messages
- **When**: User A sends a new message
- **Then**: The system includes only the last 20 messages in the LLM prompt

## TC-CONV-007: Title generation failure

- **Spec scenario**: S-CONV-7
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/chatbot.test.ts`
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: The AI service is unavailable
- **When**: User A sends the first message in conversation C
- **Then**: The message is stored, LLM response is attempted, title remains null

## TC-CONV-008: Title does not change after first message

- **Spec scenario**: S-CONV-8
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/chatbot.test.ts`
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Given**: Conversation C has title `"Free weekend events"`
- **When**: User A sends a second message about `"tutoring gigs"`
- **Then**: Title remains `"Free weekend events"`

## TC-CONV-009: Conversation list sidebar — UI

- **Spec scenario**: —
- **Type**: Automated + Manual
- **Automated in**: `apps/web/src/routes/_app/ai/-index.test.tsx`, `e2e/ai.spec.ts`
- **Phase introduced**: 5
- **Regression**: Phase 5+
- **Steps**:
  1. Sign in, navigate to the chat page
  2. Verify the sidebar lists existing conversations with titles
  3. Click a conversation to load its messages
  4. Create a new conversation
  5. Verify it appears at the top of the sidebar
- **Expected**: Sidebar renders correctly; switching conversations loads the correct history

## TC-CONV-010: Title generation rejects leaked prompt instructions

- **Spec scenario**: S-CONV-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/conversation-titles.test.ts`
- **Phase introduced**: 6
- **Regression**: Phase 6+
- **Given**: The title-generation model returns prompt-like instructions instead of a concise title
- **When**: The system generates the first conversation title
- **Then**: It falls back to a sanitized title derived from the first user message

## TC-CONV-011: Conversation threads can be deleted

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/conversations.test.ts`, `apps/web/src/routes/_app/ai/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A user owns a saved conversation thread
- **When**: They confirm deletion from the BuckAI sidebar
- **Then**: The conversation is deleted and no longer appears in the sidebar
