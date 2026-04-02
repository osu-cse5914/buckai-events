# Public Profile Test Cases

Spec: [`public-profile`](../../specs/users/public-profile.md)

---

## TC-PUB-001: View another user's profile

- **Spec scenario**: S-PUB-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-id.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User B exists with displayName, major, interests, followerCount, followingCount
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: The response contains all public fields and `isFollowing` status

## TC-PUB-002: Email not visible on public profile

- **Spec scenario**: S-PUB-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-id.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User B exists with email `brutus@osu.edu`
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: The response does not contain the email field

## TC-PUB-003: Created events on profile (only OPEN/IN_PROGRESS)

- **Spec scenario**: S-PUB-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-id.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User B created 3 events (2 OPEN, 1 CANCELLED)
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: The response includes only the 2 active events in `createdEvents.items`

## TC-PUB-004: isFollowing is true

- **Spec scenario**: S-PUB-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-id.test.ts`
- **Phase introduced**: 3
- **Regression**: Phase 3+
- **Given**: User A follows user B
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: `isFollowing` is `true`

## TC-PUB-005: isFollowing is false

- **Spec scenario**: S-PUB-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-id.test.ts`
- **Phase introduced**: 3
- **Regression**: Phase 3+
- **Given**: User A does not follow user B
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: `isFollowing` is `false`

## TC-PUB-006: User not found returns 404

- **Spec scenario**: S-PUB-6
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-id.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: No user exists with id `nonexistent`
- **When**: User A sends `GET /api/v1/users/nonexistent`
- **Then**: The API responds with 404 Not Found

## TC-PUB-008: Non-numeric pagination params return 400

- **Spec scenario**: S-PUB-7
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-id.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User B exists
- **When**: User A sends `GET /api/v1/users/B?limit=abc&offset=xyz`
- **Then**: The API responds with 400 Bad Request using RFC 7807 Problem Details format

## TC-PUB-007: Public profile page renders correctly — UI

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/components/users/public-profile.test.tsx`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: The authenticated user opens another user's public profile
- **When**: The profile data loads into the public-profile surface
- **Then**: Public fields, counts, and active created events render while private fields remain hidden
