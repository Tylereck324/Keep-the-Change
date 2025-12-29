# CSV Transaction Import Design

## Overview

A multi-step wizard for importing bank transaction CSV files (specifically Ally Bank format) with smart category matching and duplicate detection.

## Core Requirements

- Import Ally Bank CSV format (Date, Time, Amount, Type, Description)
- Smart category matching using keywords + historical learning
- Duplicate detection with manual review
- Multi-step wizard for clear workflow
- Accessible from Transactions page

## Architecture

### Core Components

**1. Import Wizard Dialog**
- Multi-step dialog component with 4 steps
- Progress indicator showing current step (1/4, 2/4, etc.)
- Back/Next/Cancel buttons for navigation

**2. Category Matching System**

Two-part matching approach:

**Keyword Rules:**
- Store in new table `category_keywords` (category_id, keyword)
- Example: Gas category has keywords ["gas", "gasbuddy", "fuel", "shell", "bp"]
- Managed in Settings page
- Case-insensitive matching

**Transaction History Learning:**
- When user manually assigns a category during import, remember the merchant name pattern
- Check existing transactions: if "GasBuddy" was used before with Gas category, auto-suggest Gas
- Extract merchant name from description for pattern matching

**3. CSV Parser**
- Client-side parsing (no data sent to server until user confirms)
- Parse Ally format: Date, Time, Amount, Type, Description
- Convert to app format: date (YYYY-MM-DD), amount (absolute value), description
- Use `papaparse` library for robust CSV parsing

**4. Duplicate Detection**
- Match on: same date + same amount + similar description (fuzzy match, 80% threshold)
- Check against existing transactions in database
- Flag potential duplicates for user review

## Database Schema

### New Tables

```sql
-- Keyword rules for category matching
category_keywords (
  id uuid primary key,
  household_id uuid references households(id),
  category_id uuid references categories(id),
  keyword text not null,
  created_at timestamp default now()
)

-- Historical merchant patterns (optional - for learning)
merchant_patterns (
  id uuid primary key,
  household_id uuid references households(id),
  merchant_name text not null,
  category_id uuid references categories(id),
  last_used_at timestamp default now()
)
```

## User Flow

### Step 1: Upload CSV

**UI:**
- Big dropzone area: "Drop CSV file here or click to browse"
- Standard HTML file input
- Visual feedback on file hover

**Validation:**
- Check file type is CSV
- Verify required columns exist (Date, Amount, Description)
- Show error if format doesn't match Ally's structure
- Parse CSV client-side into transaction objects

**Errors Handled:**
- Wrong file type → "Please upload a CSV file"
- Missing required columns → "CSV must have Date, Amount, and Description columns"
- Empty file → "CSV file is empty"
- File too large (>5MB) → "File too large. Please import transactions in smaller batches"

### Step 2: Review & Categorize

**UI:**
- Table of parsed transactions (scrollable if many)
- Each row shows: Date | Description | Amount | Category dropdown
- Bulk selection checkboxes
- Filter dropdown: "Show all" | "Show only uncategorized"

**Category Dropdown Behavior:**
- Auto-selected if keyword match found (highlight row in green)
- Auto-selected if historical match found (highlight row in blue)
- Empty if no match (highlight row in yellow) - user picks manually
- All dropdowns are editable - user can change any suggestion

**Bulk Actions:**
- "Apply category to all selected" button
- Select all checkbox in header

**Data Parsing Errors:**
- Invalid date format → Skip row, show warning: "Row 5 skipped: invalid date"
- Invalid amount → Skip row, show warning: "Row 8 skipped: invalid amount"
- Missing required fields → Skip row with warning
- Show summary: "Successfully parsed 95/100 rows (5 rows skipped due to errors)"

### Step 3: Handle Duplicates

**Only shows if duplicates detected**

**UI:**
- Side-by-side comparison for each potential duplicate:
  - Left column: Existing transaction in database
  - Right column: New transaction from CSV
- Options for each: "Skip import" | "Import anyway"
- Checkbox: "Remember my choice for remaining duplicates"

**Duplicate Detection Logic:**
- Same date + same amount + similar description (fuzzy match, 80% similarity)
- Edge cases:
  - Same amount, same day, different merchant → Not flagged as duplicate
  - User marks "Import anyway" → Don't flag it again in this session

### Step 4: Confirm Import

**UI:**
- Summary statistics:
  - "Importing 47 transactions (3 skipped as duplicates)"
  - Breakdown by category: "Gas: 12, Groceries: 8, Shopping: 15..."
- Big "Import Transactions" button
- Progress bar during import
- Success message: "Successfully imported 47 transactions"

**Import Process:**
- Server action bulk inserts transactions
- Process in batches of 100 to avoid timeout
- Show progress bar
- On success: Close wizard, refresh transactions list
- On error: Show error message with retry option

## Keyword Management UI

### Location
Settings page, new section: "Import Settings"

### UI Layout
For each category:
- Category name with color dot
- List of keywords displayed as chips/badges
- "+ Add keyword" button
- Delete icon (×) on each keyword chip
- Example display:
  ```
  🟢 Gas
  [gas] [gasbuddy] [fuel] [shell] [chevron] [+ Add keyword]
  ```

### Keyword Features
- Case-insensitive matching
- Auto-suggest common keywords based on category name when first created
- Validation: prevent duplicate keywords for same category

## Error Handling

### Category Matching Edge Cases
- No categories exist yet → Show warning: "Create categories first before importing"
- All transactions uncategorized → Allow import, suggest creating keyword rules in Settings
- Ambiguous matches (multiple keywords match) → Pick first match, let user review

### Import Errors
- Database error during bulk insert → Roll back entire import, show error message
- Network error → Show retry button
- Partial success (some transactions fail) → Show which succeeded/failed, allow retry of failed ones

### Performance Considerations
- Large CSV files (>1000 rows) → Process in chunks, show progress
- CSV parsing happens client-side → No sensitive data sent to server until confirmed
- Batch insert on server side to avoid timeout

## Technical Implementation

### Component Structure
```
components/
  csv-import-wizard.tsx           - Main wizard dialog component
  csv-import-steps/
    step1-upload.tsx              - File upload step
    step2-review.tsx              - Review & categorize step
    step3-duplicates.tsx          - Duplicate handling step
    step4-confirm.tsx             - Confirmation & import step
  keyword-management.tsx          - Settings page keyword UI

lib/
  actions/
    csv-import.ts                 - Server actions for bulk import
    keywords.ts                   - CRUD for category keywords
  utils/
    csv-parser.ts                 - Client-side CSV parsing (papaparse)
    category-matcher.ts           - Matching logic (keywords + history)
    duplicate-detector.ts         - Duplicate detection logic
```

### Dependencies
- `papaparse` - Robust CSV parsing library
- `fuzzball` or similar - For fuzzy string matching (duplicate detection)

### CSV Format Support

**Ally Bank Format:**
```csv
Date, Time, Amount, Type, Description
2025-12-29,11:29:27,-0.01,Withdrawal,"PAYPAL *PYPL PAYIN4..."
```

**Mapping to App Format:**
- Date → date (YYYY-MM-DD format, already compatible)
- Amount → amount (convert to absolute value, negative means withdrawal)
- Description → description (use as-is)
- Time + Type → ignored

## Success Criteria

- User can upload Ally Bank CSV file
- Transactions are parsed correctly with >95% success rate
- Smart category matching works for both keywords and historical patterns
- Duplicate detection prevents accidental re-imports
- User can review and adjust all suggestions before importing
- Bulk import completes successfully for files up to 1000 transactions
- Keyword management is accessible and intuitive in Settings
- Import process is non-blocking and shows clear progress
- All errors are handled gracefully with helpful messages
