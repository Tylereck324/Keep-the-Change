# Plan: Category Management

## Goal
Improve the category management functionality to allow users to fully control their budget categories, including creation, editing, and deletion.

## Context
Users needed the ability to delete categories that were no longer relevant. The system should handle this gracefully, ensuring that transactions associated with deleted categories are handled appropriately (e.g., becoming uncategorized).

## Tasks

- [x] **Implement Delete Functionality**
    - [x] Add server action `deleteCategory`.
    - [x] Update `CategoryForm` to include a "Delete" button when editing.
    - [x] Add client-side confirmation dialog to prevent accidental deletion.
- [ ] **Verification & Polish**
    - [ ] Verify database behavior: Ensure transactions linked to a deleted category are set to NULL (uncategorized) or similar, rather than causing foreign key errors.
    - [ ] Add visual feedback (toast notification) upon successful deletion (currently uses `alert` on error, silent success with revalidation).
