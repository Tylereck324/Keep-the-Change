# CSV Import Feature

## Overview

The CSV Import feature allows users to bulk import transactions from CSV files exported from their bank (specifically optimized for Ally Bank format). The feature includes intelligent category matching, duplicate detection, and a 4-step wizard interface for reviewing and confirming imports.

## User Guide

### How to Import Transactions

1. **Navigate to Transactions Page**
   - Click on "Transactions" in the navigation
   - Click the "Import CSV" button in the top-right corner

2. **Step 1: Upload CSV File**
   - Drag and drop your CSV file or click to browse
   - Supported format: CSV files up to 5MB
   - Required columns: Date, Amount, Description
   - Date format: YYYY-MM-DD
   - The system will automatically parse and validate your file

3. **Step 2: Review & Categorize**
   - The system automatically suggests categories using:
     - **Keyword matching** (green highlight): Matches transaction description against your configured keywords
     - **Historical matching** (blue highlight): Matches against merchant patterns learned from your previous transactions
     - **No match** (yellow highlight): Requires manual category selection
   - You can manually assign categories to any transaction
   - Use bulk actions to assign the same category to multiple transactions:
     - Select transactions using checkboxes
     - Choose a category from the dropdown
     - Click "Assign to selected"
   - Filter to show only uncategorized transactions
   - All transactions must have a category before proceeding

4. **Step 3: Duplicate Check**
   - The system detects potential duplicates by comparing:
     - Same date (exact match)
     - Amount (exact match)
     - Description (80%+ similarity)
   - For each duplicate found, you can:
     - **Skip import**: Don't import this transaction (it's already in your system)
     - **Import anyway**: Import it as a new transaction
   - Use "Skip all remaining duplicates" or "Import all remaining duplicates" to process multiple duplicates at once
   - If no duplicates are found, this step is automatically skipped

5. **Step 4: Confirm & Import**
   - Review the import summary showing:
     - Total number of transactions to import
     - Breakdown by category
   - Click "Confirm & Import" to complete the import
   - The system will:
     - Import all transactions in batches of 100
     - Learn new merchant patterns from manually categorized transactions
     - Refresh your transaction list

### Managing Keywords

Keywords help the system automatically categorize imported transactions by matching against transaction descriptions.

1. **Navigate to Settings**
   - Click "Settings" in the navigation
   - Scroll to the "Import Settings" section

2. **Add Keywords**
   - Each category has its own keyword list
   - Type a keyword in the input field (e.g., "starbucks", "amazon", "gas")
   - Press Enter or click "Add"
   - Keywords are case-insensitive and matched against transaction descriptions

3. **Remove Keywords**
   - Click the "×" button on any keyword badge to remove it

4. **Best Practices**
   - Add common merchant names for each category
   - Use lowercase for consistency
   - Add variations of merchant names (e.g., "walmart", "wal-mart", "wal mart")
   - Keywords are matched as substrings, so "amazon" will match "AMAZON.COM" or "Amazon Prime"

### Expected CSV Format

The CSV parser is optimized for Ally Bank CSV exports but supports any CSV with these columns:

```csv
Date,Amount,Description
2024-01-15,42.50,STARBUCKS STORE #12345
2024-01-16,125.00,AMAZON.COM
2024-01-17,35.75,SHELL GAS STATION
```

**Column Details:**
- **Date**: YYYY-MM-DD format (e.g., 2024-01-15)
- **Amount**: Positive numbers (negative values will be converted to positive)
- **Description**: Transaction description (max 100 characters)

**Additional Columns:**
- Additional columns are ignored
- Column order matters - Date must be first, Amount second, Description third
- Headers are required

## Technical Details

### Architecture

The CSV import feature is built with the following components:

#### Database Tables

1. **category_keywords**
   - Stores keywords for automatic category matching
   - Schema: `id`, `household_id`, `category_id`, `keyword`, `created_at`
   - Unique constraint on `household_id` + `category_id` + `keyword`

2. **merchant_patterns**
   - Stores learned merchant-to-category mappings
   - Schema: `id`, `household_id`, `merchant_name`, `category_id`, `last_used_at`
   - Unique constraint on `household_id` + `merchant_name`
   - Updated via upsert when users manually categorize transactions

#### Server Actions

1. **keywords.ts**
   - `getAllKeywords()`: Fetch all keywords grouped by category
   - `addKeyword(categoryId, keyword)`: Add a new keyword (normalized to lowercase)
   - `deleteKeyword(keywordId)`: Delete a keyword
   - Validates keyword length (max 100 characters)

2. **csv-import.ts**
   - `bulkImportTransactions(transactions)`: Import transactions in batches of 100
   - `getMerchantPatterns()`: Fetch all merchant patterns for current household
   - `learnMerchantPattern(merchantName, categoryId)`: Store or update a merchant pattern
   - Returns detailed results including success count, failure count, and error messages

#### Utilities

1. **csv-parser.ts**
   - `validateCSVFile(file)`: Validates file type, size (max 5MB)
   - `parseAllyBankCSV(content)`: Parses CSV content into structured transactions
   - Converts negative amounts to positive
   - Validates date format, amount range (max $100M)
   - Truncates descriptions to 100 characters

2. **category-matcher.ts**
   - `matchCategory(description, keywords, merchantPatterns)`: Auto-matches categories
   - Priority: Keywords first, then historical patterns
   - Returns `{ categoryId, matchType }` where matchType is 'keyword' | 'historical' | 'none'
   - Case-insensitive substring matching for keywords
   - Exact match (case-insensitive) for merchant patterns

3. **duplicate-detector.ts**
   - `findDuplicates(importTransactions, existingTransactions)`: Detects potential duplicates
   - Matching criteria:
     - Same date (exact match)
     - Exact amount match
     - Description similarity ≥80% (using Levenshtein distance)
   - Returns array of `{ importIndex, existingTransaction, similarity }`

#### UI Components

1. **csv-import-wizard.tsx**
   - Main orchestrator component
   - Manages step state (1-4) and data flow between steps
   - Resets all state when dialog closes
   - Props: categories, keywordsByCategory, merchantPatterns, existingTransactions

2. **step1-upload.tsx**
   - Drag-and-drop file upload
   - File validation and parsing
   - Shows parsing errors if any
   - Auto-advances to step 2 on successful parse

3. **step2-review.tsx**
   - Auto-categorizes transactions using matcher
   - Displays color-coded rows (green=keyword, blue=historical, yellow=no match)
   - Bulk actions for selecting and categorizing multiple transactions
   - Filter to show only uncategorized
   - Validates all transactions have categories before proceeding

4. **step3-duplicates.tsx**
   - One-by-one duplicate review
   - Shows side-by-side comparison of new vs. existing transaction
   - Options to skip or import each duplicate
   - "Remember choice" feature for bulk skip/import
   - Auto-skips if no duplicates found

5. **step4-confirm.tsx**
   - Summary statistics (total, top categories)
   - Progress bar during import
   - Learns merchant patterns from manually categorized transactions
   - Shows success/failure results
   - Auto-closes dialog on successful import after 1 second

6. **keyword-management.tsx**
   - Per-category keyword management
   - Add/delete keywords with immediate feedback
   - Shows keywords as badges with delete buttons
   - Displays helpful tips about keyword matching

### Data Flow

```
1. User uploads CSV
   ↓
2. CSV Parser validates and parses file
   ↓
3. Category Matcher auto-assigns categories using keywords/patterns
   ↓
4. User reviews and manually adjusts categories
   ↓
5. Duplicate Detector finds potential duplicates
   ↓
6. User reviews duplicates and decides skip/import
   ↓
7. Bulk Import processes transactions in batches
   ↓
8. Learn Merchant Patterns stores new patterns from manual categorizations
   ↓
9. Revalidate paths to refresh UI
```

### Error Handling

- **File validation errors**: Shown in Step 1 (file too large, wrong type, etc.)
- **Parse errors**: Shown in Step 1 (invalid CSV format, missing columns, etc.)
- **Validation errors**: Caught during bulk import (invalid dates, amounts, etc.)
- **Import errors**: Shown in Step 4 with detailed error messages per transaction
- **Batch failures**: If a batch fails, all transactions in that batch are marked as failed
- **Pattern learning errors**: Logged but don't block import success

### Performance Considerations

1. **Batch Processing**
   - Transactions imported in batches of 100 to avoid timeouts
   - Progress indicator shows status during import

2. **Duplicate Detection**
   - Only checks transactions that haven't been excluded
   - Uses efficient string similarity algorithm (Levenshtein distance)

3. **Pattern Learning**
   - Only learns from manually categorized transactions (matchType='none')
   - Uses upsert to avoid duplicate patterns and update last_used_at

4. **Revalidation**
   - Paths revalidated after import and pattern learning
   - Ensures UI shows latest data without requiring manual refresh

### Testing

To test the CSV import feature:

1. **Create test categories** in Settings
2. **Add keywords** for each category (e.g., "coffee" for Dining, "gas" for Transportation)
3. **Create a test CSV file**:
   ```csv
   Date,Amount,Description
   2024-01-15,4.50,STARBUCKS COFFEE
   2024-01-16,35.00,SHELL GAS STATION
   2024-01-17,125.00,AMAZON.COM
   ```
4. **Import the CSV** and verify:
   - Keywords match correctly (Starbucks → Dining if "coffee" keyword exists)
   - Can manually categorize unmatched transactions
   - Bulk actions work for multiple selections
5. **Re-import the same CSV** to test duplicate detection
6. **Verify learned patterns** by importing similar merchant names

## Future Enhancements

Potential improvements for future versions:

1. **Support for multiple bank formats** (Chase, Bank of America, etc.)
2. **Custom column mapping** - let users map their CSV columns to Date/Amount/Description
3. **Date range filtering** - only import transactions within a specific date range
4. **Category rules engine** - more sophisticated matching (regex, amount ranges, date patterns)
5. **Import history** - track previous imports and prevent re-importing the same file
6. **Undo import** - ability to delete all transactions from a specific import
7. **Export feature** - export transactions back to CSV format
8. **Scheduled imports** - automatically import from connected bank accounts
9. **Import templates** - save and reuse column mappings for different banks
10. **Merchant name normalization** - clean up merchant names (remove locations, numbers, etc.)
