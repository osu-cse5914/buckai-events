# Global Navigation

**Status**: Draft
**Related spec**: [`app-pages.md`](app-pages.md)

The authenticated shell exposes one consistent navigation model across desktop and mobile.

## Desktop Shell

From left to right, the desktop header contains:

- `Social OSU` wordmark
  - Links to `Featured`

- Primary navigation
  - `Featured`
  - `Catalog`
  - `You`

- Search input
  - Lives in the header
  - Submits into the full `Search` page
  - Carries the current query into search-route state

- `AI` button
  - Opens the dedicated `AI` destination
  - Remains separate from the primary tab bar

- Avatar menu
  - Includes `My Profile`
  - Includes provider-managed account actions such as account management
  - Includes session actions such as sign out
  - May include `Debug` in development-only environments

## Mobile Shell

Mobile navigation is a responsive presentation of the same model.

- The same core destinations remain available
- `Featured`, `Catalog`, and `You` stay primary destinations
- `Search` and `AI` may appear inside a sheet, drawer, or other mobile navigation surface
- Mobile presentation does not create new pages or replace the canonical route model

## Navigation Boundaries

- `Collections` and `Applications` are reached through `You`, not the top-level header
- `My Profile` is reached through the avatar menu, not the tab bar
- Event, gig, profile, and collection detail routes are full pages, but they are not primary navigation items
