# Router App Shell Migration

Date: 2026-04-15

## Goal

Remove the `_authenticated` route-group naming and migrate toward a neutral shared app shell with route-level auth guards.

This repo already now has:

- a neutral shared shell module in `apps/web/src/components/layout/app-shell.tsx`
- route-level auth guards via `requireSignedInBeforeLoad`
- mixed public/private access working without shell-level path checks

## Remaining work

The remaining migration is mostly file-system and generated-router cleanup:

1. rename the pathless route group from `_authenticated` to a neutral name such as `_app`
2. update each `createFileRoute("/_authenticated...")` literal accordingly
3. move the route files to the matching folder/file names
4. regenerate `apps/web/src/routeTree.gen.ts`
5. rerun the full web suite

## Scope

Routes that still live under `_authenticated` today:

- shell route
- featured
- events / gigs
- event detail / new / edit / applications
- search
- ai
- social
- profile
- users/:id
- debug
- all `you/*` routes

## Recommended order

1. keep `app-shell.tsx` as the single source of truth for shell UI while moving files
2. rename the pathless shell route file first
3. migrate the route files in this order:
   - public discovery: `featured`, `events`, `gigs`, `events/$eventId`, `users/$id`
   - private app tools: `search`, `ai`, `social`, `profile`, `debug`
   - `you/*`
   - event mutation routes: `events/new`, `events/$eventId/edit`, `events/$eventId/applications`
4. regenerate route tree
5. update any route-id-specific tests

## Notes

- This is a structural refactor, not a URL change. Public URLs stay the same.
- Because `routeTree.gen.ts` is generated, it should not be hand-maintained long term.
- The current codebase is already safe to run with mixed public/private access because auth is no longer enforced by a shell-wide pathname wall.
