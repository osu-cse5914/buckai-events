# Conversations

## Overview

Conversations persist the chatbot's message history. Each user can have multiple conversations. Messages are stored with their role (USER, ASSISTANT, SYSTEM) and loaded as context for the LLM.

## Behaviors

### Conversation CRUD

- **Create**: `POST /conversations` creates a new empty conversation for the authenticated user.
- **List**: `GET /conversations` returns the user's conversations, ordered by updatedAt descending.
- **Read messages**: `GET /conversations/:id/messages` returns the message history for a conversation, ordered by createdAt ascending.
- **Send message**: `POST /conversations/:id/messages` sends a user message and returns the streamed LLM response.

### Title Generation

When the first user message is sent in a conversation, the system auto-generates a title based on the message content (e.g., "Music events this weekend"). If title generation fails (AI unavailable), the title remains null. The title is generated once and does not update on subsequent messages.

### Message Storage

Every message is stored in the Message table:
- User messages are stored with role `USER`.
- LLM responses are stored with role `ASSISTANT` after streaming completes.
- System messages (e.g., tool call results) are stored with role `SYSTEM`.

### Conversation Ownership

Users can only access their own conversations. Accessing another user's conversation returns 404.

## Scenarios

### S-CONV-1: Create a conversation

```
GIVEN user A is authenticated
WHEN user A sends POST /conversations
THEN a Conversation is created with userId = user A, title = null
```

### S-CONV-2: List conversations

```
GIVEN user A has 3 conversations, last updated at T1, T2, T3 (T3 most recent)
WHEN user A sends GET /conversations
THEN the response contains conversations ordered [T3, T2, T1]
```

### S-CONV-3: Send first message and auto-title

```
GIVEN user A has conversation C with no messages
WHEN user A sends POST /conversations/C/messages with { content: "What free events are happening this weekend?" }
THEN a Message is created with role USER
AND the LLM response is streamed back
AND the assistant's response is stored as a Message with role ASSISTANT
AND conversation C's title is auto-generated (e.g., "Free weekend events")
```

### S-CONV-4: Get message history

```
GIVEN conversation C has 5 messages
WHEN user A sends GET /conversations/C/messages
THEN the response contains 5 messages ordered by createdAt ascending
```

### S-CONV-5: Cannot access another user's conversation

```
GIVEN user A owns conversation C
WHEN user B sends GET /conversations/C/messages
THEN the API responds with 404 Not Found
```

### S-CONV-6: Conversation context window

```
GIVEN conversation C has 30 messages
WHEN user A sends a new message
THEN the system includes only the last 20 messages in the LLM prompt
```

### S-CONV-7: Title generation failure

```
GIVEN the AI service is unavailable
WHEN user A sends the first message in conversation C
THEN the message is stored and the LLM response is attempted
AND conversation C's title remains null
```

### S-CONV-8: Title does not change after first message

```
GIVEN conversation C has title "Free weekend events" (generated from the first message)
WHEN user A sends a second message about "tutoring gigs"
THEN conversation C's title remains "Free weekend events"
```

## Test Cases

See [`test-cases/chat/conversations.md`](../../test-cases/chat/conversations.md) for the full test case registry (TC-CONV-001 through TC-CONV-009), including automated CRUD/ownership tests and manual sidebar UI verification.
