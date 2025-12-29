# Smart Budget Warnings Design

## Overview

A proactive warning system that alerts users in real-time when adding a transaction would exceed a category's budget, with intelligent suggestions to use alternative categories that have available funds.

## Core Concept

When adding a transaction that would exceed a category's budget, show an inline warning with:
- How much over budget this transaction would put you
- Alternative categories sorted by available budget (most → least)
- Visual safety indicators (🟢 >50% left, 🟡 20-50% left, 🔴 <20% left)
- One-tap to switch the transaction to a different category

## User Flow

**Scenario:** Adding a $45 grocery transaction, but Groceries only has $30 left

1. Fill out Quick Add form: $45, select "Groceries"
2. Before clicking "Add," warning appears below category selector:
   ```
   ⚠️ Warning: This will exceed your Groceries budget by $15

   Suggest using a different category?
   🟢 Entertainment - $120 left
   🟢 Shopping - $85 left
   🟡 Dining Out - $22 left
   🔴 Gas - $8 left

   [Keep Groceries] [Switch Category]
   ```
3. Tap "Switch Category" → shows same list as buttons
4. Tap "Entertainment" → category auto-switches, warning disappears
5. Or tap "Keep Groceries" → warning dismissed, saves to Groceries anyway

## Implementation Details

### Trigger Logic

**When the warning appears:**
- Calculate in real-time as user selects category (before save)
- Check: `(current_spent + new_amount) > budgeted_amount`
- Only show warning if transaction would cause overage (not if already over)

### Data Calculation

**For each category, calculate:**
- `remaining = budgeted_amount - spent_this_month`
- `percent_used = (spent / budgeted) * 100`
- Sort by `remaining` descending (most available first)

**Visual indicators:**
- 🟢 Green: >50% budget remaining
- 🟡 Yellow: 20-50% budget remaining
- 🔴 Red: <20% budget remaining

### Component Structure

```
TransactionForm / QuickAddButton
└─ BudgetWarning (new component)
   ├─ Warning message with overage amount
   ├─ CategorySuggestionList
   │  └─ CategorySuggestion (shows name, color, amount left, indicator)
   └─ Action buttons (Keep / Switch)
```

### Where It Appears

- Quick Add dialog (floating + button)
- Full transaction form on Transactions page
- Transaction edit mode (if changing amount/category would cause overage)

## Edge Cases & Behavior

### No Budget Set for Category
- No warning shown (can't exceed if there's no limit)
- Optional: Show gentle info "💡 No budget set for this category"

### All Categories Over/Low
- Still show list, but all might be 🔴 red
- User can still choose "least bad" option
- Keep "Keep [Original Category]" button available

### Transaction Amount Changes After Category Selected
- Re-calculate warning dynamically
- Warning appears/disappears as needed

### Editing Existing Transaction
- Show warning if new amount would cause overage
- Account for removing the old amount first (don't double-count)

### Multiple Transactions in Quick Succession
- Each calculation uses most current spent amount
- Warning reflects real-time budget state

## UI Design

### Warning Card Styling
- Amber/yellow background (alert without alarm)
- Rounded corners, subtle shadow
- Icon: ⚠️ warning triangle
- Friendly but clear language

### Suggestion Cards
- Show category color dot
- Amount left in dollars
- Visual indicator (🟢🟡🔴)
- Hover effect to show it's clickable

### Buttons
- Primary: "Switch Category" (recommended action)
- Secondary: "Keep [Category Name]" (allows override)

## Technical Requirements

### New Components
1. `BudgetWarning.tsx` - Warning container with logic
2. `CategorySuggestion.tsx` - Individual suggestion card

### Modified Components
1. `QuickAddButton.tsx` - Integrate warning
2. `TransactionForm.tsx` - Integrate warning

### New Utilities
1. `calculateBudgetStatus()` - Returns remaining, percent_used, indicator
2. `getSortedCategorySuggestions()` - Returns categories sorted by remaining budget

## Success Criteria

- Warning appears instantly when overage would occur
- Suggestions are accurate and up-to-date
- One-tap category switching works smoothly
- User can override warning if needed
- No performance impact on transaction entry
