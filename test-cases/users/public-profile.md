# Public Profile Test Cases

Spec: [`public-profile`](../../specs/users/public-profile.md)

---

## TC-PUB-001: View another user's profile

- **Spec scenario**: S-PUB-1
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User B exists with displayName, major, interests, followerCount, followingCount
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: The response contains all public fields and `isFollowing` status

## TC-PUB-002: Email not visible on public profile

- **Spec scenario**: S-PUB-2
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User B exists with email `brutus@osu.edu`
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: The response does not contain the email field

## TC-PUB-003: Created events on profile (only OPEN/IN_PROGRESS)

- **Spec scenario**: S-PUB-3
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User B created 3 events (2 OPEN, 1 CANCELLED)
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: The response includes only the 2 OPEN events

## TC-PUB-004: isFollowing is true

- **Spec scenario**: S-PUB-4
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Phase 3+
- **Given**: User A follows user B
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: `isFollowing` is `true`

## TC-PUB-005: isFollowing is false

- **Spec scenario**: S-PUB-5
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Phase 3+
- **Given**: User A does not follow user B
- **When**: User A sends `GET /api/v1/users/B`
- **Then**: `isFollowing` is `false`

## TC-PUB-006: User not found returns 404

- **Spec scenario**: S-PUB-6
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: No user exists with id `nonexistent`
- **When**: User A sends `GET /api/v1/users/nonexistent`
- **Then**: The API responds with 404 Not Found

## TC-PUB-008: Non-numeric pagination params return 400

- **Spec scenario**: —
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User B exists
- **When**: User A sends `GET /api/v1/users/B?limit=abc&offset=xyz`
- **Then**: The API responds with 400 Bad Request using RFC 7807 Problem Details format

## TC-PUB-007: Public profile page renders correctly — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 1
- **Regression**: Always
- **Steps**:
  1. Sign in as User A
  2. Navigate to User B's public profile page
  3. Verify displayName, major, interests, follower/following counts are shown
  4. Verify email is NOT shown
  5. Verify created events are listed
- **Expected**: All public fields are visible; private fields are hidden
