# Phase 0 Regression Suite — Foundation

Run this suite when the Phase 0 milestone is closed.

## Automated

```sh
bun run test:regression:phase-0
```

### Included automated test cases

- **TC-AUTH-001**: Valid OSU email sign-up
- **TC-AUTH-002**: Valid BuckeyeMail sign-up
- **TC-AUTH-004**: Valid JWT on API request
- **TC-AUTH-005**: Missing or invalid JWT returns 401
- **TC-AUTH-006**: First-time user provisioning
- **TC-AUTH-009**: Concurrent provisioning race condition
- **TC-AUTH-010**: Clerk sign-up UI renders

## Manual checklist

Create a GitHub Issue with this checklist before milestone close:

- [ ] **TC-AUTH-003**: Non-OSU email rejected (attempt sign-up with non-OSU domain)
- [ ] **TC-AUTH-007**: Clerk sign-in UI renders on desktop
- [ ] **TC-AUTH-008**: Clerk sign-in UI renders on mobile
- [ ] Prisma schema: verify all enums exist and match spec (`data-model`)
- [ ] Prisma schema: verify all models have correct fields, constraints, and cascades
- [ ] Prisma migration: `bun run db:migrate` runs cleanly on a fresh database
- [ ] `bun run dev` starts both frontend and backend without errors
- [ ] `bun run build` completes without errors
- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
