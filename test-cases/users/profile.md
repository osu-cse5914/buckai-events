# User Profile Test Cases

Spec: [`profile`](../../specs/users/profile.md)

---

## TC-USER-001: Get own profile

- **Spec scenario**: S-USER-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-me.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `GET /users/me`
- **Then**: The response contains user A's id, email, displayName, major, gradYear, interests, createdAt, updatedAt

## TC-USER-002: Update display name

- **Spec scenario**: S-USER-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-me.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `PATCH /users/me` with `{ "displayName": "Brutus" }`
- **Then**: User A's displayName is `"Brutus"` and updatedAt is refreshed

## TC-USER-003: Update interests

- **Spec scenario**: S-USER-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-me.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `PATCH /users/me` with `{ "interests": ["music", "sports", "tech"] }`
- **Then**: User A's interests are `["music", "sports", "tech"]`

## TC-USER-004: Partial update preserves other fields

- **Spec scenario**: S-USER-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-me.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A has displayName `"Brutus"` and major `"CS"`
- **When**: User A sends `PATCH /users/me` with `{ "major": "ECE" }`
- **Then**: Major is `"ECE"` and displayName is still `"Brutus"`

## TC-USER-005: Cannot update email via profile endpoint

- **Spec scenario**: S-USER-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-me.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `PATCH /users/me` with `{ "email": "new@osu.edu" }`
- **Then**: The email field is ignored; user A's email is unchanged

## TC-USER-008: PATCH /users/me rejects non-object JSON payloads

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-me.test.ts`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `PATCH /users/me` with a non-object JSON payload (e.g., `null`, `42`, `"string"`)
- **Then**: The API responds with 400 Bad Request using RFC 7807 Problem Details format

## TC-USER-009: GET /users/me includes role

- **Spec scenario**: S-USER-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-me.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `GET /users/me`
- **Then**: The response includes user A's persisted `role`

## TC-USER-010: PATCH /users/me ignores role changes

- **Spec scenario**: S-USER-6
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/users-me.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A is authenticated with role `USER`
- **When**: User A sends `PATCH /users/me` with `{ "role": "ADMIN" }`
- **Then**: The `role` field is ignored and remains `USER`

## TC-USER-006: Profile edit form — UI

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/profile/-index.test.tsx`, `apps/mobile/src/screens/profile-screen.test.tsx`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: The authenticated user is on their profile page
- **When**: They edit their display name and major and save the form
- **Then**: The page submits the PATCH request with the new values

## TC-USER-007: Profile edit form preserves data on navigation

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/profile/-index.test.tsx`
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: The authenticated user has opened the profile edit form
- **When**: They change a value and cancel without saving
- **Then**: The page returns to view mode and discards the unsaved edits
