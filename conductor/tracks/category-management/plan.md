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
- [x] **Verification & Polish**
    - [x] Verify database behavior: Ensure transactions linked to a deleted category are set to NULL (uncategorized) or similar, rather than causing foreign key errors. (Verified via schema: `on delete set null`)
    - [x] Add visual feedback (toast notification) upon successful deletion.
    - [x] **Code Review Fixes**:
        - [x] Replace `window.confirm` with `AlertDialog`.
        - [x] Fix accessibility (aria-labels on color picker).
        - [x] Extract colors to constants.
        - [x] Centralize delete logic in `CategoryForm` and `DeleteCategoryDialog`.
        - [x] Improve `revalidatePath` specificity to ensure `/budget` and `/transactions` update.
        - [x] Verified that uncategorized transactions do not disappear from "Total Spent".
    - [x] **Lead Dev Review Fixes**:
        - [x] Removed Nested Modal (removed delete button from Form).
        - [x] Renamed `lib/constants/index.ts` to `lib/constants.ts`.
        - [x] Used `revalidatePath('/', 'layout')` for robust cache clearing.
    - [x] **Principal Architect Review Fixes (Soft Deletes)**:
        - [x] Updated schema to include `deleted_at`.
        - [x] Changed logic to "Archive" instead of "Delete" to preserve historical data.
        - [x] Updated UI terminology to "Archive".
    - [x] **QA & Edge Case Fixes**:
        - [x] Prevent creating duplicate category names (active only).
        - [x] Prevent ghost budgets (don't rollover archived categories).
    - [x] **Senior Dev Optimization Fixes**:
        - [x] Fixed Regression: Restored "Archive" capability to Budget Page by creating `BudgetCategoryRow`.
        - [x] Refactored `Dashboard` to use shared `CategoryCard` instead of code duplication.
