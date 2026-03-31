# App Pages

**Status**: Draft
**Test cases**: [`/test-cases/system/app-pages.md`](../../test-cases/system/app-pages.md)

## Overview

This spec defines the authenticated app's page architecture. It describes the top-level navigation model, the full pages that make up the product, what belongs on each page, and which interactions remain overlays or menus instead of becoming standalone routes.

This spec is intentionally limited to information architecture. It does not define visual design tokens, component styling, or testing strategy.

Unless otherwise noted, this spec covers the authenticated product shell. Sign-in, sign-up, and the developer-only debug page remain separate system pages outside the primary product navigation model.

Route recommendations in this document are intentionally conservative. The authenticated shell keeps `/` as a redirect into `Featured`, but primary destination routes should otherwise use their canonical paths directly instead of legacy aliases.

This merged spec normalizes older naming into the current page model:

- `Home Page` becomes `Featured`
- Separate `Events` and `Gigs` browse pages become `Catalog` with item-type filtering
- `My Page` becomes `You`
- `AI Agent Page` becomes `AI`

## Navigation Model

The authenticated app is organized around five primary destinations and one secondary account control. The primary navbar exposes separate `Search` and `AI` controls in the shell in addition to the tab bar.

| Item | Surface Type | Purpose | Route Recommendation |
| --- | --- | --- | --- |
| Featured | Full page | Personalized discovery and recommendation feed | `/featured` with `/` allowed as an alias or redirect |
| Catalog | Full page | Exhaustive browse of events and gigs without recommendation framing | `/catalog` |
| Search | Full page | Traditional query and filter driven discovery with AI enhancement | `/search` |
| AI | Full page | Chat-based agent for conversational discovery and assistant workflows | `/ai` |
| You | Full page | Personal hub for collections, applications, user-owned content, and app-level settings | `/you` |
| Avatar Menu | Menu / overlay | Entry point for profile editing and account/session actions | No standalone route |

### Separation of Concerns

- Content discovery lives in `Featured`, `Catalog`, `Search`, and `AI`.
- Personal management lives in `You`.
- Identity and account access begins from the `Avatar Menu`.
- `My Profile` is a dedicated page reached from the avatar menu, not a primary navigation item.
- Entity detail pages such as an event page, public profile page, or collection page are full pages, but they are not additional top-level navigation items.

### Navigation Principles

- `Featured` is the default authenticated landing destination.
- `Catalog`, `Search`, and `AI` are all discovery surfaces, but they serve different intents: `Catalog` is browse-first, `Search` is traditional query-first search with optional AI enhancement, and `AI` is conversation-first.
- `You` is the user's operational workspace. It owns personal management surfaces such as collections, applications, and user-owned listings.
- `Avatar Menu` is not a page and does not compete with the five primary destinations.

## Primary Navigation

### Featured

`Featured` is the primary personalized discovery surface.

It contains:

- A recommendation-ranked feed of events and gigs
- Recommendation framing such as "because you liked", interest alignment, or similar personalization cues
- Discovery modules such as `Recommended`, `Popular`, and `Upcoming` when the product needs multiple feed groupings
- Feed-level filters that refine recommended content without turning the page into the exhaustive browse surface
- Quick actions such as save, apply, or open detail

It does not contain:

- Exhaustive "all items" framing
- Neutral browse ordering presented as the main value proposition

### Catalog

`Catalog` is the exhaustive browse surface for all events and gigs.

It contains:

- A comprehensive list of available events and gigs
- Neutral browse controls such as item-type filters, category filters, sorting, pagination, and category narrowing
- Sort options such as date-driven ordering and engagement-driven ordering when supported
- URL-owned browse state so filters and pagination survive reload, browser history, and shared links
- Results shown without recommendation framing
- Entry points into event and gig detail pages

It does not contain:

- Personalized recommendation explanations as the defining page frame

### You

`You` is the personal hub for the authenticated user's own activity and owned content.

It contains:

- A summary view of the user's collections, applications, owned events and gigs, and relevant personal settings
- Status snapshots, counts, and recent activity relevant to the current user
- Shortcuts into `You` subpages
- Summary modules that replace the older `Collections`, `Applications`, and `Created` sections from `My Page`

It does not contain:

- Profile editing as a top-level concern
- Account-session actions such as sign out or external account management

Collections and applications are not top-level navigation items. They are subpages under `You`.

### Search

`Search` is the direct-intent discovery surface.

It contains:

- A direct query input for keyword or semantic search
- Search results for events and gigs, including mixed result sets when supported
- Structured filters that refine explicit search results
- URL-owned query, filter, and pagination state so search sessions are durable across reload, browser history, and shared links
- AI enhancement that improves search, such as summaries or refinement help
- A clear link or handoff control into AI mode
- Recent searches when supported

`Search` is distinct from `Featured` because the user drives the session with an explicit query instead of consuming a recommendation feed.

### AI

`AI` is the conversational discovery surface.

It contains:

- A chat-based agent entry point for natural-language event and gig discovery
- A new-conversation entry point
- Conversation history or recent conversations when supported
- Assistant responses that can surface structured event and gig results
- Confirmation moments for assistant-driven actions such as save or apply

It does not contain:

- Plain search results as the defining page frame
- The exhaustive browse framing owned by `Catalog`

## Page Inventory

### Primary Pages

#### Featured Feed Page

- **Purpose**: Personalized discovery home
- **Route recommendation**: `/featured` or `/`
- **Belongs on this page**:
  - Personalized event and gig feed
  - Recommendation reasons or personalization labels
  - Discovery modules such as recommended, popular, and upcoming
  - Feed filters scoped to discovery
  - Quick actions that launch overlays or navigate to detail pages

#### Catalog Page

- **Purpose**: Exhaustive browse of events and gigs
- **Route recommendation**: `/catalog`
- **Belongs on this page**:
  - Full browse list
  - Item-type, category, and sort controls
  - Pagination or infinite scrolling
  - Entry to event and gig detail pages

#### You Hub Page

- **Purpose**: Personal home for user-managed areas
- **Route recommendation**: `/you`
- **Belongs on this page**:
  - Summary cards or modules for collections, applications, and user-owned events and gigs
  - Recent activity and status snapshots relevant to the current user
  - Navigation into `You` subpages
  - Entry points for app-level preferences

#### Search Page

- **Purpose**: Traditional query-first discovery with AI enhancement
- **Route recommendation**: `/search`
- **Belongs on this page**:
  - Search input
  - Search results
  - Explicit search filters
  - AI-assisted search enhancements that help refine or interpret results without replacing the search page
  - A clear link or handoff into AI mode
  - Recent searches when supported

#### AI Assistant Page

- **Purpose**: Chat-based agent home
- **Route recommendation**: `/ai`
- **Belongs on this page**:
  - Entry point to start a new chat-based agent session
  - Recent or pinned conversations when supported
  - Agent-centric empty-state guidance
  - Sidebar or list navigation for prior conversations when supported

#### AI Conversation Page

- **Purpose**: Persist and resume an AI-assisted discovery session
- **Route recommendation**: `/ai/conversations/:conversationId`
- **Belongs on this page**:
  - Conversation transcript
  - Tool-backed event and gig results returned by the assistant
  - Confirmation moments for actions such as save or apply
  - Entry back to the AI home page

AI conversations belong to the `AI` section. A persisted conversation is a full page, not a modal-only experience.

### `You` Pages

#### Collections Index

- **Purpose**: Manage the user's saved collections
- **Route recommendation**: `/you/collections`
- **Belongs on this page**:
  - List of the user's collections
  - Create collection action
  - Visibility indicators
  - Links to collection detail pages

#### Collection Detail

- **Purpose**: View a single collection and its saved items
- **Route recommendation**: `/you/collections/:collectionId`
- **Belongs on this page**:
  - Collection metadata
  - Saved events and gigs
  - Owner management actions when the viewer owns the collection
  - Public read-only presentation when the collection is public and viewed by others

Collection detail remains part of the `You` information architecture. If public collection sharing later needs a directly shareable public URL, that can be added without promoting collections to top-level navigation.

#### Applications Page

- **Purpose**: Track the user's submitted gig applications
- **Route recommendation**: `/you/applications`
- **Belongs on this page**:
  - The user's applications
  - Application statuses
  - Links back to the related gig detail pages
  - Empty-state guidance when the user has not applied to any gigs

#### Your Events and Gigs Page

- **Purpose**: Manage user-owned event and gig listings
- **Route recommendation**: `/you/events`
- **Belongs on this page**:
  - Events and gigs created by the current user
  - Status and ownership controls
  - Entry points to create, edit, and manage owned listings

#### App Settings Page

- **Purpose**: Manage in-app preferences
- **Route recommendation**: `/you/settings`
- **Belongs on this page**:
  - App-level preferences such as notification or discovery settings when supported
  - Product behavior settings that affect the user's in-app experience

This page does not replace `My Profile` and does not own account-session actions.

### Shared Detail and Workflow Pages

#### Event / Gig Detail Page

- **Purpose**: Canonical full-page view for a single event or gig
- **Route recommendation**: `/events/:eventId`
- **Belongs on this page**:
  - Title, categories, organizer, date and time, location, capacity or participant count, description, and notes
  - Organizer information
  - Contextual actions such as save, apply, edit, or manage applications
  - Navigation back to discovery or management surfaces

The canonical detail experience is a full page. A lightweight preview overlay may exist, but it does not replace the route-owned detail view.

Save and apply remain actions launched from this page. They do not create separate applicant-facing pages.

#### Event / Gig Composer Pages

- **Purpose**: Create or edit a user-owned event or gig
- **Route recommendation**: `/events/new`, `/events/:eventId/edit`
- **Belongs on this page**:
  - Full create and edit form
  - Validation and submission flow

#### Gig Application Management Page

- **Purpose**: Review applicants for a gig owned by the current user
- **Route recommendation**: `/events/:eventId/applications`
- **Belongs on this page**:
  - Applicant list
  - Application messages
  - Accept and reject controls

This is a full page for gig owners. It is not the same surface as the applicant's own applications page under `You`.

#### Public Profile Page

- **Purpose**: View another user's public identity and public activity
- **Route recommendation**: `/users/:id`
- **Belongs on this page**:
  - Public profile fields
  - Follow and unfollow control
  - Public-facing created events and gigs
  - Public collections or other public user-owned content when supported

#### My Profile Page

- **Purpose**: Edit the current user's personal profile
- **Route recommendation**: `/profile`
- **Access model**: Reached from the `Avatar Menu`
- **Belongs on this page**:
  - Editable profile fields such as display name, major, graduation year, interests, and similar identity-facing fields
  - A clear boundary between what is public profile data and what is private account data
  - Optional link to preview the user's public profile

`My Profile` is a separate page accessed from the avatar menu. It is not the `You` landing page, and it is not a primary navigation item.

## Avatar Menu

The avatar control opens a menu or popover anchored to the user's avatar in the authenticated shell.

The avatar menu contains:

- A link to `My Profile`
- Account-management actions such as "Manage account" when those actions are handled by the auth provider or a dedicated account surface
- Session actions such as sign out

The avatar menu does not contain:

- Collections
- Applications
- A duplicate of the `You` hub
- Full-page content embedded inside the menu

If account management opens a hosted auth-provider page, that remains an account action launched from the avatar menu rather than becoming a primary app destination.

## Non-Page Flows

The following are explicitly not standalone pages:

### Save to Collection

Saving an event or gig to a collection is an overlay flow, such as a dialog, popover, or sheet launched from a card, detail page, or chat confirmation. It is not a separate route-level page.

### Apply to Gig

Applying to a gig is an overlay flow launched from the gig detail page or an AI confirmation flow. The applicant does not navigate to a dedicated apply page. The persistent record of that action is the applications page under `You`.

### Confirmation Dialogs

Destructive confirmations and mutation confirmations remain dialogs or inline confirmations. They do not own canonical content and do not become pages.

### Avatar Menu

The avatar menu is an anchored menu, not a page. Opening or closing it does not represent route navigation.

### Mobile Navigation

Mobile navigation is a responsive presentation of the same primary navigation model. A sheet, drawer, bottom bar, or similar mobile nav treatment does not introduce new pages.

## Information Architecture Rules

- The authenticated product has five primary destinations only: `Featured`, `Catalog`, `Search`, `AI`, and `You`.
- `Avatar Menu` is secondary account navigation and never replaces or duplicates a primary destination.
- `Featured`, `Catalog`, `Search`, and `AI` are discovery surfaces; `You` is the personal management surface.
- The merged page model normalizes legacy names: `Home` becomes `Featured`, separate `Events` and `Gigs` browse pages collapse into `Catalog`, `My Page` becomes `You`, and `AI Agent Page` becomes `AI`.
- `Catalog` and `Search` keep their active browse state in URL search params so filters, query text, and pagination survive refresh, history navigation, and shared links.
- `My Profile` is a dedicated full page reached from the avatar menu, not part of the `You` hub.
- Collections and applications are subpages under `You`, not top-level tabs.
- Account and session actions stay in the avatar menu or provider-managed account flow, not inside `You`.
- Profile editing and account-session management are separate concerns. `My Profile` owns profile data; the avatar menu owns account-session actions.
- Event, profile, and collection detail views are full pages because they need durable URLs, browser history support, and deep linking.
- Save, apply, confirm, and menu interactions stay as overlays because they are action flows, not canonical destinations.
- `Featured` is the only page whose defining frame is recommendation and personalization.
- `Featured` may organize content into recommended, popular, and upcoming modules without turning into a neutral browse page.
- `Catalog` is the neutral browse surface and must not be framed as a recommendation feed.
- `Catalog` owns item-type filtering; separate top-level `Events` and `Gigs` browse tabs are removed.
- `Catalog` uses `/catalog` as its canonical app-page route; the legacy `/events` alias is removed.
- `Search` is the traditional query-first destination. It may offer lightweight AI enhancement and a handoff into AI mode, but it does not own assistant conversation history.
- `You` applications use `/you/applications` as their canonical route; the legacy `/applications` alias is removed.
- `AI` is the chat-based, conversation-first destination and owns assistant conversation routes.

## Scenarios

### S-PAGES-1: Default authenticated landing goes to Featured

```
GIVEN a user is authenticated
WHEN the user enters the app shell
THEN the default destination is Featured
AND the page presents personalized discovery rather than the exhaustive catalog
```

### S-PAGES-2: Catalog is separate from Featured

```
GIVEN a user navigates to Catalog
WHEN the page renders
THEN the page shows the full browse surface for events and gigs
AND it does not frame the results as personalized recommendations
```

### S-PAGES-3: Collections and applications live under You

```
GIVEN a user opens the personal area of the app
WHEN the user needs to manage saved collections or submitted gig applications
THEN those destinations are reached through You
AND they are not separate top-level navigation tabs
```

### S-PAGES-4: My Profile is separate from You

```
GIVEN a user wants to edit personal profile fields
WHEN the user opens the avatar menu
THEN the user can navigate to a dedicated My Profile page
AND that page is separate from the You hub
```

### S-PAGES-5: Avatar menu owns account-session actions

```
GIVEN a user wants to sign out or manage account-session settings
WHEN the user opens the avatar menu
THEN those actions are available from the menu
AND they do not appear as primary navigation destinations
```

### S-PAGES-6: Save to collection is not a page

```
GIVEN a user wants to save an event
WHEN the user triggers the save action from a card, detail page, or chat flow
THEN the system opens an overlay flow to choose a collection
AND the user does not navigate to a dedicated save page
```

### S-PAGES-7: Apply to gig is not a page

```
GIVEN a user wants to apply to a gig
WHEN the user starts the apply action
THEN the system presents an overlay application flow
AND the resulting record is later visible on the applications page under You
```

### S-PAGES-8: Search includes AI enhancement but links to AI mode

```
GIVEN a user is on the Search page
WHEN the user wants extra help refining or interpreting a query
THEN the page can offer AI-enhanced assistance
AND the page provides a clear link or handoff into AI mode
```

### S-PAGES-9: AI is a dedicated chat-based agent tab

```
GIVEN a user looks at the primary navbar
WHEN the user chooses the AI destination
THEN the app opens a chat-based agent surface
AND that surface is separate from the Search page
```

### S-PAGES-10: Catalog URL preserves browse state

```
GIVEN a user applies filters or pagination on Catalog
WHEN the user reloads the page, navigates with the browser history, or shares the URL
THEN the same filters and pagination state are restored from the URL
AND the page continues to render the neutral browse surface
```

### S-PAGES-11: Search URL preserves query-first state

```
GIVEN a user enters a search query, applies search filters, or changes pagination on Search
WHEN the user reloads the page, navigates with the browser history, or shares the URL
THEN the same query, filters, and pagination state are restored from the URL
AND the page continues to render the matching search session
```
