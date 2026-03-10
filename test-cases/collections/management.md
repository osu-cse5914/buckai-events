# Collections Test Cases

Spec: [`management`](../../specs/collections/management.md)

---

## TC-COL-001: Create a collection

- **Spec scenario**: S-COL-1
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /collections` with `{ name: "Music Events" }`
- **Then**: A Collection is created with visibility PRIVATE, userId = user A

## TC-COL-002: Create a public collection

- **Spec scenario**: S-COL-2
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /collections` with `{ name: "Must See", visibility: "PUBLIC" }`
- **Then**: A Collection is created with visibility PUBLIC

## TC-COL-003: Add event to collection

- **Spec scenario**: S-COL-3
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A owns collection C and event E exists
- **When**: User A sends `POST /collections/C/items` with `{ eventId: E }`
- **Then**: A CollectionItem is created and a SAVE interaction is recorded

## TC-COL-004: Cannot add duplicate event

- **Spec scenario**: S-COL-4
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Collection C already contains event E
- **When**: User A sends `POST /collections/C/items` with `{ eventId: E }`
- **Then**: The API responds with 409 Conflict

## TC-COL-005: Remove event from collection

- **Spec scenario**: S-COL-5
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Collection C contains event E
- **When**: User A sends `DELETE /collections/C/items/E`
- **Then**: The CollectionItem is removed; event E still exists in the system

## TC-COL-006: List own collections

- **Spec scenario**: S-COL-6
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has 3 collections
- **When**: User A sends `GET /collections`
- **Then**: The response contains 3 collections ordered by updatedAt descending

## TC-COL-007: View public collection as another user

- **Spec scenario**: S-COL-7
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has collection C with visibility PUBLIC
- **When**: User B sends `GET /collections/C`
- **Then**: The response contains the collection and its items

## TC-COL-008: Cannot view private collection of another user

- **Spec scenario**: S-COL-8
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has collection C with visibility PRIVATE
- **When**: User B sends `GET /collections/C`
- **Then**: The API responds with 404 Not Found

## TC-COL-009: Change collection visibility

- **Spec scenario**: S-COL-9
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has collection C with visibility PRIVATE
- **When**: User A sends `PATCH /collections/C` with `{ visibility: "PUBLIC" }`
- **Then**: Collection C's visibility is PUBLIC

## TC-COL-010: Delete collection cascades to items

- **Spec scenario**: S-COL-10
- **Type**: Automated
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has collection C with 5 items
- **When**: User A sends `DELETE /collections/C`
- **Then**: Collection C and all 5 CollectionItems are deleted; referenced events are not affected

## TC-COL-011: "Save to Collection" button — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 2
- **Regression**: Always
- **Steps**:
  1. Navigate to an event detail page
  2. Click "Save to Collection"
  3. Select or create a collection
  4. Verify the event appears in the selected collection
- **Expected**: Save flow works end-to-end with visual confirmation

## TC-COL-012: Collections page — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 2
- **Regression**: Always
- **Steps**:
  1. Navigate to the Collections page
  2. Create a new collection
  3. View collection details
  4. Delete a collection
- **Expected**: CRUD operations work from the UI with correct state updates
