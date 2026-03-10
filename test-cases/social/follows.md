# Follows Test Cases

Spec: [`follows`](../../specs/social/follows.md)

---

## TC-FOL-001: Follow a user

- **Spec scenario**: S-FOL-1
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A is authenticated and user B exists
- **When**: User A sends `POST /users/B/follow`
- **Then**: A Follow record is created; user B's followerCount +1; user A's followingCount +1

## TC-FOL-002: Cannot follow yourself

- **Spec scenario**: S-FOL-2
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /users/A/follow`
- **Then**: The API responds with 400 Bad Request

## TC-FOL-003: Cannot follow twice

- **Spec scenario**: S-FOL-3
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A already follows user B
- **When**: User A sends `POST /users/B/follow`
- **Then**: The API responds with 409 Conflict

## TC-FOL-004: Unfollow a user

- **Spec scenario**: S-FOL-4
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows user B
- **When**: User A sends `DELETE /users/B/follow`
- **Then**: Follow record is deleted; user B's followerCount -1; user A's followingCount -1

## TC-FOL-005: Unfollow when not following

- **Spec scenario**: S-FOL-5
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A does not follow user B
- **When**: User A sends `DELETE /users/B/follow`
- **Then**: The API responds with 404 Not Found

## TC-FOL-006: List followers

- **Spec scenario**: S-FOL-6
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User B has 3 followers
- **When**: Any authenticated user sends `GET /users/B/followers`
- **Then**: The response contains 3 user profiles

## TC-FOL-007: List following

- **Spec scenario**: S-FOL-7
- **Type**: Automated
- **Phase introduced**: 3
- **Regression**: Always
- **Given**: User A follows 5 users
- **When**: Any authenticated user sends `GET /users/A/following`
- **Then**: The response contains 5 user profiles

## TC-FOL-008: Follow/unfollow button on profile — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 3
- **Regression**: Always
- **Steps**:
  1. Sign in as User A, navigate to User B's public profile
  2. Click the "Follow" button
  3. Verify the button changes to "Unfollow" and follower count increments
  4. Click "Unfollow"
  5. Verify the button reverts and count decrements
- **Expected**: Follow/unfollow toggles correctly with count updates

## TC-FOL-009: Followers/following lists on profile — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 3
- **Regression**: Always
- **Steps**:
  1. Navigate to a user's profile who has followers and follows others
  2. Click on "Followers" count to see the list
  3. Click on "Following" count to see the list
- **Expected**: Both lists render correctly with user names and profile links
