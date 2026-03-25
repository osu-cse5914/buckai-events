# App Pages

## Overview

This spec defines the app's page architecture for authenticated users. It describes the top-level navigation model, the full pages that make up the product, what content belongs on each page, and which interactions remain overlays or menus instead of becoming standalone routes.

This spec is intentionally limited to information architecture. It does not define visual design tokens, component styling, or testing strategy.

Unless otherwise noted, this spec covers the authenticated product shell. Sign-in, sign-up, and the developer-only debug page remain separate system pages outside the primary product navigation model.

## Navigation Model

The authenticated app is organized around four primary destinations and one secondary account control:

| Item | Surface Type | Purpose | Recommended Route |
| --- | --- | --- | --- |
| Featured | Full page | Personalized discovery and recommendation feed | `/featured` with `/` allowed as an alias or redirect |
| Catalog | Full page | Exhaustive browse of events and gigs without recommendation framing | `/catalog` |
| You | Full page | Personal hub for collections, applications, user-owned content, and app-level settings | `/you` |
| Search | Full page | Direct search plus AI/chat entry for intent-driven discovery | `/search` |
| Avatar Menu | Menu / overlay | Entry point for profile editing and account/session actions | No standalone route |

### Navigation Principles

- `Featured` is the default authenticated landing destination.
- `Catalog` and `Search` are discovery surfaces, but they serve different intents: `Catalog` is browse-first, `Search` is query-first.
- `You` is the user's operational workspace. It owns personal management surfaces such as collections and applications.
- `Avatar Menu` is not a page and does not compete with the four primary destinations.
- Entity detail pages such as an event page, public profile page, or collection page are full pages, but they are not additional top-level navigation items.

## Primary Navigation

### Featured

`Featured` is the primary personalized discovery surface.

It contains:

- A recommendation-ranked feed of events and gigs
- Recommendation framing, such as "because you liked", interest alignment, or similar personalization cues
- Feed-level filters that refine recommended content without turning the page into the exhaustive browse surface
- Quick actions such as save, apply, or open detail

It does not contain:

- Exhaustive "all items" framing
- Neutral browse ordering presented as the main value proposition

### Catalog

`Catalog` is the exhaustive browse surface for all events and gigs.

It contains:

- A comprehensive list of available events and gigs
- Neutral browse controls such as filters, sorting, pagination, and category narrowing
- Results shown without recommendation framing
- Entry points into event and gig detail pages

It does not contain:

- Personalized recommendation explanations as the defining page frame

### You

`You` is the personal hub for the authenticated user's own activity and owned content.

It contains:

- A summary view of the user's collections, applications, and owned events/gigs
- Shortcuts into `You` subpages
- App-level personal settings when those settings are about product behavior or preferences

`You` does not own:

- Profile editing as a top-level concern
- Account-session actions such as sign out or external account management

Collections and applications are not top-level navigation items. They are subpages under `You`.

### Search

`Search` is the direct-intent discovery surface.

It contains:

- A direct query input for keyword or semantic search
- Search results for events and gigs
- Structured filters that refine explicit search results
- An AI/chat entry point for users who want conversational discovery instead of manual filtering
- Access to persisted conversations when chat history is part of the product

`Search` is distinct from `Featured` because the user drives the session with an explicit query instead of consuming a recommendation feed.

## Page Inventory

### Primary Pages

#### Featured Feed Page

- **Purpose**: Personalized discovery home
- **Route recommendation**: `/featured` or `/`
- **Belongs on this page**:
  - Personalized event and gig feed
  - Recommendation reasons or personalization labels
  - Feed filters scoped to discovery
  - Quick actions that launch overlays or navigate to detail pages

#### Catalog Page

- **Purpose**: Exhaustive browse of events and gigs
- **Route recommendation**: `/catalog`
- **Belongs on this page**:
  - Full browse list
  - Filter and sort controls
  - Pagination or infinite scrolling
  - Entry to event/gig detail pages

#### Search Page

- **Purpose**: Query-first discovery and AI assistant entry
- **Route recommendation**: `/search`
- **Belongs on this page**:
  - Search input
  - Search results
  - Explicit search filters
  - Entry point to start a new AI-assisted search/chat session
  - Recent searches or recent conversations when supported

#### Search Conversation Page

- **Purpose**: Persist and resume an AI-assisted discovery session
- **Route recommendation**: `/search/conversations/:conversationId`
- **Belongs on this page**:
  - Conversation transcript
  - Tool-backed event and gig results returned by the assistant
  - Confirmation moments for actions such as save or apply
  - Entry back to broader search

AI chat belongs to the `Search` section. A persisted conversation is a full page, not a modal-only experience and not a separate top-level destination.

#### You Hub Page

- **Purpose**: Personal home for user-managed areas
- **Route recommendation**: `/you`
- **Belongs on this page**:
  - Summary cards or modules for collections, applications, and user-owned events/gigs
  - Status snapshots, counts, and recent activity relevant to the current user
  - Navigation into `You` subpages
  - App-level settings entry points

### `You` Subpages

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
- **Route recommendation**: `/collections/:collectionId`
- **Belongs on this page**:
  - Collection metadata
  - Saved events and gigs
  - Owner management actions when the viewer owns the collection
  - Public read-only presentation when the collection is public and viewed by others

Collections remain part of the `You` information architecture even though a collection detail page may also be directly addressable by URL.

#### Applications Page

- **Purpose**: Track the user's submitted gig applications
- **Route recommendation**: `/you/applications`
- **Belongs on this page**:
  - The user's applications
  - Application statuses
  - Links back to the related gig detail pages
  - Empty state guidance when the user has not applied to any gigs

#### Your Events & Gigs Page

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

### Shared Detail Pages

#### Event / Gig Detail Page

- **Purpose**: Canonical full-page view for a single event or gig
- **Route recommendation**: `/events/:eventId`
- **Belongs on this page**:
  - Full event or gig information
  - Organizer information
  - Contextual actions such as save, apply, edit, or manage applications

Save and apply remain actions launched from this page; they do not create separate applicant-facing pages.

#### Event / Gig Composer Pages

- **Purpose**: Create or edit a user-owned event or gig
- **Route recommendation**: `/events/new`, `/events/:eventId/edit`
- **Belongs on this page**:
  - Full create/edit form
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
  - Follow/unfollow control
  - Public-facing created events/gigs
  - Public collections or other public user-owned content when supported

#### My Profile Page

- **Purpose**: Edit the current user's personal profile
- **Route recommendation**: `/me/profile`
- **Access model**: Reached from the `Avatar Menu`
- **Belongs on this page**:
  - Editable profile fields such as display name, major, graduation year, interests, and similar identity-facing fields
  - A clear boundary between what is public profile data and what is private account data
  - Optional link to preview the user's public profile

`My Profile` is a separate page accessed from the avatar. It is not the `You` landing page, and it is not a primary navigation item.

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

Applying to a gig is an overlay flow launched from the gig detail page or an AI confirmation flow. The applicant does not navigate to a dedicated "apply" page. The persistent record of that action is the applications page under `You`.

### Confirmation Dialogs

Destructive confirmations and mutation confirmations remain dialogs or inline confirmations. They do not own canonical content and do not become pages.

### Avatar Menu

The avatar menu is an anchored menu, not a page. Opening or closing it does not represent route navigation.

### Mobile Navigation

Mobile navigation is a responsive presentation of the same primary navigation model. A sheet, drawer, bottom bar, or similar mobile nav treatment does not introduce new pages.

## Information Architecture Rules

- The authenticated product has four primary destinations only: `Featured`, `Catalog`, `You`, and `Search`.
- `Avatar Menu` is secondary account navigation and never replaces or duplicates a primary destination.
- `My Profile` is a dedicated full page accessed from the avatar menu.
- Collections and applications are subpages under `You`, not top-level tabs.
- Account and session actions stay in the avatar menu or provider-managed account flow, not inside `You`.
- Profile editing and account/session management are separate concerns. `My Profile` owns profile data; the avatar menu owns account/session actions.
- Event, profile, and collection detail views are full pages because they need durable URLs, browser history support, and deep linking.
- Save, apply, confirm, and menu interactions stay as overlays because they are action flows, not canonical destinations.
- `Featured` is the only page whose defining frame is recommendation and personalization.
- `Catalog` is the neutral browse surface and must not be framed as a recommendation feed.
- `Search` is the query-first destination and may include dedicated conversation routes, but chat remains part of the `Search` section rather than becoming a fifth top-level nav item.

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

### S-PAGES-8: Search owns AI chat entry

```
GIVEN a user wants conversational discovery
WHEN the user uses the AI assistant entry point
THEN that interaction is part of the Search section
AND the app does not add AI chat as a separate top-level navigation tab
```