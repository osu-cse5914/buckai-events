# User Profile Test Cases

Spec: [`profile`](../../specs/users/profile.md)

---

## TC-USER-001: Get own profile

- **Spec scenario**: S-USER-1
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `GET /users/me`
- **Then**: The response contains user A's id, email, displayName, major, gradYear, interests, createdAt, updatedAt

## TC-USER-002: Update display name

- **Spec scenario**: S-USER-2
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `PATCH /users/me` with `{ "displayName": "Brutus" }`
- **Then**: User A's displayName is `"Brutus"` and updatedAt is refreshed

## TC-USER-003: Update interests

- **Spec scenario**: S-USER-3
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `PATCH /users/me` with `{ "interests": ["music", "sports", "tech"] }`
- **Then**: User A's interests are `["music", "sports", "tech"]`

## TC-USER-004: Partial update preserves other fields

- **Spec scenario**: S-USER-4
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A has displayName `"Brutus"` and major `"CS"`
- **When**: User A sends `PATCH /users/me` with `{ "major": "ECE" }`
- **Then**: Major is `"ECE"` and displayName is still `"Brutus"`

## TC-USER-005: Cannot update email via profile endpoint

- **Spec scenario**: S-USER-5
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `PATCH /users/me` with `{ "email": "new@osu.edu" }`
- **Then**: The email field is ignored; user A's email is unchanged

## TC-USER-008: PATCH /users/me rejects non-object JSON payloads

- **Spec scenario**: —
- **Type**: Automated
- **Phase introduced**: 1
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `PATCH /users/me` with a non-object JSON payload (e.g., `null`, `42`, `"string"`)
- **Then**: The API responds with 400 Bad Request using RFC 7807 Problem Details format

## TC-USER-009: GET /users/me includes role

- **Spec scenario**: S-USER-1
- **Type**: Automated
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `GET /users/me`
- **Then**: The response includes user A's persisted `role`

## TC-USER-010: PATCH /users/me ignores role changes

- **Spec scenario**: S-USER-6
- **Type**: Automated
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: User A is authenticated with role `USER`
- **When**: User A sends `PATCH /users/me` with `{ "role": "ADMIN" }`
- **Then**: The `role` field is ignored and remains `USER`

## TC-USER-006: Profile edit form — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 1
- **Regression**: Always
- **Steps**:
  1. Sign in and navigate to profile page
  2. Click edit, change displayName and major
  3. Save changes
  4. Refresh the page
- **Expected**: Updated values persist after refresh

## TC-USER-007: Profile edit form preserves data on navigation

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 1
- **Regression**: Always
- **Steps**:
  1. Sign in, navigate to profile page, edit displayName
  2. Navigate to another page and return to profile
- **Expected**: Saved values are retained; unsaved changes are discarded
