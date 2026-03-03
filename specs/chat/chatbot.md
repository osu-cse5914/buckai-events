# Chatbot

## Overview

The chatbot is an agentic LLM-powered assistant for event discovery. It uses Google Gemini via the Vercel AI SDK with tool/function calling to query the database and perform actions on the user's behalf. The chatbot confirms before executing any mutations.

## Architecture

```
User message
      │
      ▼
POST /conversations/:id/messages
      │
      ▼
API Worker builds prompt:
  • System instructions
  • Last N messages from conversation history
  • User profile context
      │
      ▼
Gemini API (with tool definitions)
      │
      ├── Tool call: searchEvents(filters)  → query DB → return results
      ├── Tool call: searchGigs(filters)     → query DB → return results
      ├── Tool call: getUserPreferences()    → return user profile
      ├── Tool call: applyToGig(gigId, msg)  → requires confirmation → apply
      ├── Tool call: saveEvent(eventId, collectionId) → requires confirmation → save
      │
      ▼
Streamed response via SSE
      │
      ▼
Stored in Message table
```

## System Prompt

The system prompt instructs the model to:

- Act as a campus event assistant for OSU students.
- Only answer questions related to events, gigs, and campus activities on the platform.
- Use tool calls to ground responses in real data.
- Return structured event cards when presenting events.
- Decline off-topic requests gracefully.
- Always confirm before performing mutations (apply, save, create).

## Tools

### Read-Only Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| searchEvents | query?, category?, startDate?, endDate?, limit? | Search events. Uses semantic vector search when `query` is provided; structured SQL filters otherwise |
| searchGigs | query?, minCompensation?, maxCompensation?, compensationType?, category?, limit? | Search gigs. Uses semantic vector search when `query` is provided; structured SQL filters otherwise |
| getUserPreferences | (none) | Retrieve the current user's interests and profile |

### Mutation Tools (require confirmation)

| Tool | Parameters | Description |
|------|-----------|-------------|
| applyToGig | gigId, message? | Apply to a gig on behalf of the user |
| saveEvent | eventId, collectionId? | Save an event to a collection. If collectionId is omitted, saves to the user's most recently used collection, or creates a default "Saved" collection if none exist |
| createEvent | title, description, type, location: { name, latitude?, longitude? }, startAt, endAt?, compensation?: { amount, currency?, type }, imageUrl? | Create an event or gig |

## Confirmation Flow

When the chatbot determines a mutation is needed:

1. The LLM generates a confirmation message describing the action (e.g., "I found this gig: 'Calculus Tutor — $25/hr'. Would you like me to apply for you?").
2. The frontend displays this with confirm/cancel buttons.
3. The user confirms or cancels.
4. On confirm, the frontend sends a follow-up message indicating approval. The LLM then executes the tool call.
5. On cancel, the chatbot acknowledges and continues the conversation.

## Streaming

Responses are streamed to the frontend via server-sent events (SSE) using the Vercel AI SDK's `streamText()`. The frontend renders tokens incrementally.

## Context Window

The last N messages (configurable, default 20) from the conversation history are included in the prompt. Older messages are excluded to stay within the model's context window.

## Scenarios

### S-CHAT-1: Search for events by keyword

```
GIVEN user A sends "What music events are happening this weekend?"
WHEN the chatbot processes the message
THEN it calls searchEvents with category "music" and date range for this weekend
AND returns a list of matching events as structured cards
```

### S-CHAT-2: Search for gigs

```
GIVEN user A sends "Find me a tutoring gig that pays at least $20/hr"
WHEN the chatbot processes the message
THEN it calls searchGigs with query "tutoring" and compensation filter
AND returns matching gigs
```

### S-CHAT-3: Mutation requires confirmation

```
GIVEN user A sends "Apply me to that tutoring gig"
WHEN the chatbot determines the target gig
THEN it responds with a confirmation message describing the action
AND waits for user confirmation before calling applyToGig
```

### S-CHAT-4: User confirms mutation

```
GIVEN the chatbot proposed applying to gig G
AND user A confirms
WHEN the chatbot receives the confirmation
THEN it calls applyToGig(gigId=G)
AND responds with "Done! I've submitted your application."
```

### S-CHAT-5: User cancels mutation

```
GIVEN the chatbot proposed applying to gig G
AND user A cancels
WHEN the chatbot receives the cancellation
THEN it does not call applyToGig
AND responds with "No problem, I won't apply."
```

### S-CHAT-6: Off-topic question

```
GIVEN user A sends "What's the weather like tomorrow?"
WHEN the chatbot processes the message
THEN it declines the question politely
AND suggests asking about events or gigs instead
```

### S-CHAT-7: Grounded in real data

```
GIVEN user A asks "Are there any free events tonight?"
WHEN the chatbot calls searchEvents with cost filter and today's date
AND no events match
THEN the chatbot responds "I couldn't find any free events tonight" (not a hallucinated list)
```

### S-CHAT-8: Streamed response

```
GIVEN user A sends a message
WHEN the chatbot generates a response
THEN the response is streamed token-by-token via SSE
AND the frontend renders tokens as they arrive
```

### S-CHAT-9: LLM service unavailable

```
GIVEN the Gemini API is unavailable or times out
WHEN user A sends a message
THEN the API responds with a non-streamed error message: "I'm having trouble connecting right now. Please try again in a moment."
AND the user's message is still stored in the Message table
AND no assistant message is stored
```

### S-CHAT-10: Tool call returns empty results

```
GIVEN user A asks "What coding events are happening next Tuesday?"
WHEN the chatbot calls searchEvents and gets zero results
THEN it responds honestly that no matching events were found
AND does not fabricate events
```
