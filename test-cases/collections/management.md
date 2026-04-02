# Collections Test Cases

Spec: [`management`](../../specs/collections/management.md)

---

## TC-COL-001: Create a collection

- **Spec scenario**: S-COL-1
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /collections` with `{ name: "Music Events" }`
- **Then**: A Collection is created with visibility PRIVATE, userId = user A

## TC-COL-002: Create a public collection

- **Spec scenario**: S-COL-2
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A is authenticated
- **When**: User A sends `POST /collections` with `{ name: "Must See", visibility: "PUBLIC" }`
- **Then**: A Collection is created with visibility PUBLIC

## TC-COL-003: Add event to collection

- **Spec scenario**: S-COL-3
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A owns collection C and event E exists
- **When**: User A sends `POST /collections/C/items` with `{ eventId: E }`
- **Then**: A CollectionItem is created and a SAVE interaction is recorded

## TC-COL-004: Cannot add duplicate event

- **Spec scenario**: S-COL-4
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Collection C already contains event E
- **When**: User A sends `POST /collections/C/items` with `{ eventId: E }`
- **Then**: The API responds with 409 Conflict

## TC-COL-005: Remove event from collection

- **Spec scenario**: S-COL-5
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: Collection C contains event E
- **When**: User A sends `DELETE /collections/C/items/E`
- **Then**: The CollectionItem is removed; event E still exists in the system

## TC-COL-006: List own collections

- **Spec scenario**: S-COL-6
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has 3 collections
- **When**: User A sends `GET /collections`
- **Then**: The response contains 3 collections ordered by updatedAt descending

## TC-COL-007: View public collection as another user

- **Spec scenario**: S-COL-7
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has collection C with visibility PUBLIC
- **When**: User B sends `GET /collections/C`
- **Then**: The response contains the collection and its items

## TC-COL-008: Cannot view private collection of another user

- **Spec scenario**: S-COL-8
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has collection C with visibility PRIVATE
- **When**: User B sends `GET /collections/C`
- **Then**: The API responds with 404 Not Found

## TC-COL-009: Change collection visibility

- **Spec scenario**: S-COL-9
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has collection C with visibility PRIVATE
- **When**: User A sends `PATCH /collections/C` with `{ visibility: "PUBLIC" }`
- **Then**: Collection C's visibility is PUBLIC

## TC-COL-010: Delete collection cascades to items

- **Spec scenario**: S-COL-10
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 2
- **Regression**: Always
- **Given**: User A has collection C with 5 items
- **When**: User A sends `DELETE /collections/C`
- **Then**: Collection C and all 5 CollectionItems are deleted; referenced events are not affected

## TC-COL-011: "Save to Collection" button — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 2
- **Regression**: Final only
- **Steps**:
  1. Navigate to an event detail page
  2. Click "Save to Collection"
  3. Select an existing collection from the overlay
  4. Verify the event appears in the selected collection with visible success feedback
- **Expected**: Save flow works end-to-end with the overlay-based collection picker

## TC-COL-012: Collections page — UI

- **Spec scenario**: —
- **Type**: Manual
- **Phase introduced**: 2
- **Regression**: Final only
- **Steps**:
  1. Navigate to the Collections page
  2. Create a new collection
  3. Rename or update the collection visibility
  4. View collection details and delete a collection
- **Expected**: Collections page create/manage/detail flows work from the UI with correct state updates

## TC-COL-013: Save to an existing collection from the browse overlay

- **Spec scenario**: S-COL-3, S-PAGES-6
- **Type**: Automated
- **Automated in**: `apps/web/src/components/collections/save-to-collection-button.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The user has at least one collection and an event is visible in browse
- **When**: The user clicks the save action on the browse row and selects a collection from the overlay
- **Then**: The event is added to the selected collection without navigating away

## TC-COL-015: Save from the event detail surface

- **Spec scenario**: S-COL-3
- **Type**: Automated
- **Automated in**: `apps/web/src/routes/_authenticated/events/$eventId/-index.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The user is on an event detail page and has at least one collection
- **When**: The user opens the save overlay from the detail surface and selects a collection
- **Then**: The event is added to the selected collection with visible success feedback

## TC-COL-016: List collection items with pagination

- **Spec scenario**: Listing behavior
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/collections.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A collection contains multiple saved events
- **When**: The viewer requests `GET /collections/:id/items` with `limit` and `offset`
- **Then**: The API returns the matching saved events ordered by save time with pagination metadata

## TC-COL-017: Create a collection from the Collections page

- **Spec scenario**: S-COL-1
- **Type**: Automated
- **Automated in**: `apps/web/src/components/you/you-collections-page.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The user is on the Collections page
- **When**: The user opens the create form, enters a name, chooses visibility, and submits
- **Then**: The new collection appears in the page list with the selected visibility

## TC-COL-018: Manage collections from the Collections page

- **Spec scenario**: S-COL-6, S-COL-9, S-COL-10
- **Type**: Automated
- **Automated in**: `apps/web/src/components/you/you-collections-page.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The user has at least one collection on the Collections page
- **When**: The user renames a collection, toggles its visibility, or deletes it
- **Then**: The page updates the collection row in place and removes deleted collections

## TC-COL-019: Owner can manage saved items from collection detail

- **Spec scenario**: S-COL-5
- **Type**: Automated
- **Automated in**: `apps/web/src/components/you/you-collection-detail-page.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The user owns a collection with saved events
- **When**: The user opens collection detail and removes a saved event
- **Then**: The item disappears from the detail page and the collection count updates

## TC-COL-020: Public collection detail is read-only for non-owners

- **Spec scenario**: S-COL-7, S-COL-8
- **Type**: Automated
- **Automated in**: `apps/web/src/components/you/you-collection-detail-page.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: Another user's collection is public
- **When**: The viewer opens the collection detail page
- **Then**: The saved events are visible without owner-only management actions

## TC-COL-021: Save overlay empty state hides inline collection creation

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/web/src/components/collections/save-to-collection-button.test.tsx`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The user opens the save overlay without any existing collections
- **When**: The overlay finishes loading
- **Then**: The empty state is shown without inline collection-name input or create action controls
