# CSV Transaction Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-step wizard for importing bank transaction CSV files with smart category matching and duplicate detection.

**Architecture:** Client-side CSV parsing with papaparse, multi-step dialog wizard, server actions for bulk import, keyword-based + historical category matching, fuzzy duplicate detection.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, papaparse (CSV parsing), fuzzball (fuzzy matching), shadcn/ui components

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install papaparse and fuzzball**

Run:
```bash
npm install papaparse fuzzball
npm install --save-dev @types/papaparse @types/fuzzball
```

Expected: Dependencies installed successfully

**Step 2: Verify build still works**

Run: `npm run build`
Expected: Build completes without errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add papaparse and fuzzball dependencies for CSV import"
```

---

## Task 2: Database Schema Updates

**Files:**
- Create: `docs/schema-migrations/csv-import-tables.sql`
- Modify: `lib/types.ts`

**Step 1: Write migration SQL**

Create `docs/schema-migrations/csv-import-tables.sql`:

```sql
-- Keyword rules for category matching
CREATE TABLE IF NOT EXISTS category_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, category_id, keyword)
);

-- Index for fast keyword lookups
CREATE INDEX IF NOT EXISTS idx_category_keywords_household_category
  ON category_keywords(household_id, category_id);

-- Historical merchant patterns for learning
CREATE TABLE IF NOT EXISTS merchant_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, merchant_name, category_id)
);

-- Index for fast merchant lookups
CREATE INDEX IF NOT EXISTS idx_merchant_patterns_household_merchant
  ON merchant_patterns(household_id, merchant_name);
```

**Step 2: Update TypeScript types**

In `lib/types.ts`, add after line 98 (after monthly_budgets table definition):

```typescript
      category_keywords: {
        Row: {
          id: string
          household_id: string
          category_id: string
          keyword: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          keyword: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string
          keyword?: string
          created_at?: string
        }
      }
      merchant_patterns: {
        Row: {
          id: string
          household_id: string
          merchant_name: string
          category_id: string
          last_used_at: string
        }
        Insert: {
          id?: string
          household_id: string
          merchant_name: string
          category_id: string
          last_used_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          merchant_name?: string
          category_id?: string
          last_used_at?: string
        }
      }
```

And after line 106 (after existing type exports):

```typescript
export type CategoryKeyword = Database['public']['Tables']['category_keywords']['Row']
export type MerchantPattern = Database['public']['Tables']['merchant_patterns']['Row']
```

**Step 3: Apply migration to Supabase**

Run:
```bash
npx supabase db execute --file docs/schema-migrations/csv-import-tables.sql
```

Expected: Tables created successfully (Note: If supabase CLI not configured, manual SQL execution in Supabase dashboard is acceptable)

**Step 4: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 5: Commit**

```bash
git add docs/schema-migrations/csv-import-tables.sql lib/types.ts
git commit -m "feat: add database schema for CSV import (keywords & merchant patterns)"
```

---

## Task 3: Keyword Management Server Actions

**Files:**
- Create: `lib/actions/keywords.ts`

**Step 1: Create keywords server actions file**

Create `lib/actions/keywords.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import type { CategoryKeyword } from '@/lib/types'

/**
 * Get all keywords for a specific category
 */
export async function getKeywordsByCategory(categoryId: string): Promise<CategoryKeyword[]> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('category_keywords')
    .select('*')
    .eq('household_id', householdId)
    .eq('category_id', categoryId)
    .order('keyword')

  if (error) throw new Error(`Failed to fetch keywords: ${error.message}`)
  return data || []
}

/**
 * Get all keywords grouped by category
 */
export async function getAllKeywords(): Promise<Record<string, CategoryKeyword[]>> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('category_keywords')
    .select('*')
    .eq('household_id', householdId)
    .order('keyword')

  if (error) throw new Error(`Failed to fetch keywords: ${error.message}`)

  const grouped: Record<string, CategoryKeyword[]> = {}
  for (const keyword of data || []) {
    if (!grouped[keyword.category_id]) {
      grouped[keyword.category_id] = []
    }
    grouped[keyword.category_id].push(keyword)
  }

  return grouped
}

/**
 * Add a keyword to a category
 */
export async function addKeyword(categoryId: string, keyword: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Validate inputs
  if (!keyword || keyword.trim().length === 0) {
    throw new Error('Keyword cannot be empty')
  }
  if (keyword.length > 50) {
    throw new Error('Keyword must be 50 characters or less')
  }

  const normalizedKeyword = keyword.trim().toLowerCase()

  const { error } = await supabase
    .from('category_keywords')
    // @ts-expect-error - Supabase client type inference issue
    .insert({
      household_id: householdId,
      category_id: categoryId,
      keyword: normalizedKeyword,
    })

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      throw new Error('This keyword already exists for this category')
    }
    throw new Error(`Failed to add keyword: ${error.message}`)
  }

  revalidatePath('/settings')
}

/**
 * Delete a keyword
 */
export async function deleteKeyword(keywordId: string): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('category_keywords')
    .delete()
    .eq('id', keywordId)
    .eq('household_id', householdId)

  if (error) throw new Error(`Failed to delete keyword: ${error.message}`)

  revalidatePath('/settings')
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add lib/actions/keywords.ts
git commit -m "feat: add keyword management server actions"
```

---

## Task 4: CSV Parser Utility

**Files:**
- Create: `lib/utils/csv-parser.ts`

**Step 1: Create CSV parser utility**

Create `lib/utils/csv-parser.ts`:

```typescript
import Papa from 'papaparse'

export type ParsedTransaction = {
  date: string // YYYY-MM-DD
  amount: number // positive number
  description: string
  rowNumber: number // for error reporting
}

export type ParseResult = {
  transactions: ParsedTransaction[]
  errors: Array<{ rowNumber: number; message: string }>
  summary: {
    total: number
    success: number
    failed: number
  }
}

/**
 * Parse Ally Bank CSV format
 * Expected columns: Date, Time, Amount, Type, Description
 */
export function parseAllyBankCSV(fileContent: string): ParseResult {
  const transactions: ParsedTransaction[] = []
  const errors: Array<{ rowNumber: number; message: string }> = []

  const parseResult = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  // Validate required columns exist
  const requiredColumns = ['Date', 'Amount', 'Description']
  const headers = parseResult.meta.fields || []
  const missingColumns = requiredColumns.filter(col => !headers.includes(col))

  if (missingColumns.length > 0) {
    throw new Error(`CSV must have ${requiredColumns.join(', ')} columns. Missing: ${missingColumns.join(', ')}`)
  }

  // Parse each row
  parseResult.data.forEach((row: any, index: number) => {
    const rowNumber = index + 2 // +2 because: +1 for header, +1 for 1-indexed

    try {
      // Validate date (YYYY-MM-DD format)
      const dateStr = row.Date?.trim()
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD')
      }

      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date value')
      }

      // Validate amount (convert to positive number)
      const amountStr = row.Amount?.toString().trim()
      if (!amountStr) {
        throw new Error('Missing amount')
      }

      const amount = Math.abs(parseFloat(amountStr))
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount')
      }
      if (amount > 100_000_000) {
        throw new Error('Amount exceeds maximum allowed value')
      }

      // Get description (required)
      const description = row.Description?.trim()
      if (!description) {
        throw new Error('Missing description')
      }
      if (description.length > 100) {
        throw new Error('Description must be 100 characters or less')
      }

      transactions.push({
        date: dateStr,
        amount,
        description,
        rowNumber,
      })
    } catch (error) {
      errors.push({
        rowNumber,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  return {
    transactions,
    errors,
    summary: {
      total: parseResult.data.length,
      success: transactions.length,
      failed: errors.length,
    },
  }
}

/**
 * Validate file before parsing
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.name.endsWith('.csv')) {
    return { valid: false, error: 'Please upload a CSV file' }
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Please import transactions in smaller batches' }
  }

  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'CSV file is empty' }
  }

  return { valid: true }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add lib/utils/csv-parser.ts
git commit -m "feat: add CSV parser utility for Ally Bank format"
```

---

## Task 5: Category Matcher Utility

**Files:**
- Create: `lib/utils/category-matcher.ts`

**Step 1: Create category matcher utility**

Create `lib/utils/category-matcher.ts`:

```typescript
import type { CategoryKeyword, MerchantPattern } from '@/lib/types'

export type MatchType = 'keyword' | 'historical' | 'none'

export type CategoryMatch = {
  categoryId: string | null
  matchType: MatchType
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Match a transaction description to a category using keywords
 */
function matchByKeyword(
  description: string,
  keywordsByCategory: Record<string, CategoryKeyword[]>
): string | null {
  const normalizedDesc = description.toLowerCase()

  for (const [categoryId, keywords] of Object.entries(keywordsByCategory)) {
    for (const keywordObj of keywords) {
      if (normalizedDesc.includes(keywordObj.keyword)) {
        return categoryId
      }
    }
  }

  return null
}

/**
 * Extract merchant name from transaction description
 * Simple heuristic: first word/phrase before common separators
 */
function extractMerchantName(description: string): string {
  // Remove common payment processors
  let cleaned = description.replace(/^(PAYPAL \*|KLARNA\*|DD \*)/i, '')

  // Take first part before common separators
  const parts = cleaned.split(/[\s-]+/)

  // Return first 1-2 words as merchant name
  return parts.slice(0, 2).join(' ').trim().toLowerCase()
}

/**
 * Match a transaction description to a category using historical patterns
 */
function matchByHistory(
  description: string,
  merchantPatterns: MerchantPattern[]
): string | null {
  const merchantName = extractMerchantName(description)
  if (!merchantName) return null

  // Find exact match first
  const exactMatch = merchantPatterns.find(
    p => p.merchant_name.toLowerCase() === merchantName
  )
  if (exactMatch) return exactMatch.category_id

  // Find partial match (merchant name contains pattern or vice versa)
  const partialMatch = merchantPatterns.find(
    p => merchantName.includes(p.merchant_name.toLowerCase()) ||
         p.merchant_name.toLowerCase().includes(merchantName)
  )

  return partialMatch?.category_id || null
}

/**
 * Match a transaction to a category using both keyword and historical approaches
 */
export function matchCategory(
  description: string,
  keywordsByCategory: Record<string, CategoryKeyword[]>,
  merchantPatterns: MerchantPattern[]
): CategoryMatch {
  // Try keyword matching first (higher confidence)
  const keywordMatch = matchByKeyword(description, keywordsByCategory)
  if (keywordMatch) {
    return {
      categoryId: keywordMatch,
      matchType: 'keyword',
      confidence: 'high',
    }
  }

  // Try historical matching
  const historyMatch = matchByHistory(description, merchantPatterns)
  if (historyMatch) {
    return {
      categoryId: historyMatch,
      matchType: 'historical',
      confidence: 'medium',
    }
  }

  // No match found
  return {
    categoryId: null,
    matchType: 'none',
    confidence: 'low',
  }
}

/**
 * Batch match multiple transactions
 */
export function matchCategories(
  transactions: Array<{ description: string }>,
  keywordsByCategory: Record<string, CategoryKeyword[]>,
  merchantPatterns: MerchantPattern[]
): CategoryMatch[] {
  return transactions.map(t => matchCategory(
    t.description,
    keywordsByCategory,
    merchantPatterns
  ))
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add lib/utils/category-matcher.ts
git commit -m "feat: add category matching utility (keywords + history)"
```

---

## Task 6: Duplicate Detector Utility

**Files:**
- Create: `lib/utils/duplicate-detector.ts`

**Step 1: Create duplicate detector utility**

Create `lib/utils/duplicate-detector.ts`:

```typescript
import { distance } from 'fuzzball'
import type { Transaction } from '@/lib/types'

export type DuplicateMatch = {
  importIndex: number // index in import array
  existingTransaction: Transaction
  similarity: number // 0-100
}

/**
 * Calculate similarity between two descriptions using Levenshtein distance
 */
function calculateSimilarity(desc1: string, desc2: string): number {
  return distance(desc1.toLowerCase(), desc2.toLowerCase())
}

/**
 * Check if two transactions are potential duplicates
 * Criteria: same date + same amount + similar description (80% threshold)
 */
function isPotentialDuplicate(
  newTx: { date: string; amount: number; description: string },
  existingTx: Transaction,
  similarityThreshold: number = 80
): { isDuplicate: boolean; similarity: number } {
  // Must have same date
  if (newTx.date !== existingTx.date) {
    return { isDuplicate: false, similarity: 0 }
  }

  // Must have same amount (with small tolerance for floating point)
  const amountDiff = Math.abs(newTx.amount - existingTx.amount)
  if (amountDiff > 0.01) {
    return { isDuplicate: false, similarity: 0 }
  }

  // Check description similarity
  const similarity = calculateSimilarity(
    newTx.description,
    existingTx.description || ''
  )

  const isDuplicate = similarity >= similarityThreshold

  return { isDuplicate, similarity }
}

/**
 * Find potential duplicates for a batch of transactions
 */
export function findDuplicates(
  newTransactions: Array<{ date: string; amount: number; description: string }>,
  existingTransactions: Transaction[],
  similarityThreshold: number = 80
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = []

  newTransactions.forEach((newTx, importIndex) => {
    // Find all potential matches for this transaction
    for (const existingTx of existingTransactions) {
      const { isDuplicate, similarity } = isPotentialDuplicate(
        newTx,
        existingTx,
        similarityThreshold
      )

      if (isDuplicate) {
        duplicates.push({
          importIndex,
          existingTransaction: existingTx,
          similarity,
        })
        // Only report first match per import transaction
        break
      }
    }
  })

  return duplicates
}

/**
 * Filter out transactions marked as duplicates
 */
export function filterDuplicates<T>(
  transactions: T[],
  duplicateIndices: Set<number>
): T[] {
  return transactions.filter((_, index) => !duplicateIndices.has(index))
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add lib/utils/duplicate-detector.ts
git commit -m "feat: add duplicate detection utility with fuzzy matching"
```

---

## Task 7: CSV Import Server Actions

**Files:**
- Create: `lib/actions/csv-import.ts`

**Step 1: Create CSV import server actions**

Create `lib/actions/csv-import.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import type { MerchantPattern } from '@/lib/types'

/**
 * Bulk insert transactions with batch processing
 */
export async function bulkImportTransactions(
  transactions: Array<{
    categoryId: string
    amount: number
    description: string
    date: string
  }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const batchSize = 100
  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  // Process in batches to avoid timeout
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)

    try {
      const { error } = await supabase
        .from('transactions')
        .insert(
          batch.map(t => ({
            household_id: householdId,
            category_id: t.categoryId,
            amount: t.amount,
            description: t.description,
            date: t.date,
          }))
        )

      if (error) {
        failedCount += batch.length
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      } else {
        successCount += batch.length
      }
    } catch (error) {
      failedCount += batch.length
      errors.push(
        `Batch ${Math.floor(i / batchSize) + 1}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  revalidatePath('/')
  revalidatePath('/transactions')

  return { success: successCount, failed: failedCount, errors }
}

/**
 * Get all merchant patterns for the current household
 */
export async function getMerchantPatterns(): Promise<MerchantPattern[]> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('merchant_patterns')
    .select('*')
    .eq('household_id', householdId)

  if (error) throw new Error(`Failed to fetch merchant patterns: ${error.message}`)
  return data || []
}

/**
 * Learn a new merchant pattern from user's manual category selection
 */
export async function learnMerchantPattern(
  merchantName: string,
  categoryId: string
): Promise<void> {
  const householdId = await getSession()
  if (!householdId) throw new Error('Not authenticated')

  // Normalize merchant name
  const normalizedMerchant = merchantName.trim().toLowerCase()

  // Upsert: insert or update last_used_at
  const { error } = await supabase
    .from('merchant_patterns')
    .upsert(
      {
        household_id: householdId,
        merchant_name: normalizedMerchant,
        category_id: categoryId,
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: 'household_id,merchant_name,category_id',
      }
    )

  if (error) {
    console.error('Failed to learn merchant pattern:', error)
    // Don't throw - learning is optional
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add lib/actions/csv-import.ts
git commit -m "feat: add CSV import server actions for bulk insert and learning"
```

---

## Task 8: Step 1 Upload Component

**Files:**
- Create: `components/csv-import-steps/step1-upload.tsx`

**Step 1: Create Step 1 component**

Create `components/csv-import-steps/step1-upload.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { validateCSVFile, parseAllyBankCSV, type ParseResult } from '@/lib/utils/csv-parser'

type Step1Props = {
  onComplete: (result: ParseResult) => void
}

export function Step1Upload({ onComplete }: Step1Props) {
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    setIsProcessing(true)

    // Validate file
    const validation = validateCSVFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setIsProcessing(false)
      return
    }

    try {
      // Read file content
      const content = await file.text()

      // Parse CSV
      const result = parseAllyBankCSV(content)

      // Proceed to next step
      onComplete(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload your Ally Bank CSV export to import transactions. The file should have Date, Amount, and Description columns.
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8
          flex flex-col items-center justify-center
          transition-colors cursor-pointer
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-primary/5'}
        `}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          id="csv-file-input"
          disabled={isProcessing}
        />
        <label htmlFor="csv-file-input" className="cursor-pointer text-center w-full">
          <div className="text-4xl mb-2" aria-hidden="true">📄</div>
          <p className="font-medium mb-1">
            {isProcessing ? 'Processing...' : 'Drop CSV file here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum file size: 5MB
          </p>
        </label>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add components/csv-import-steps/step1-upload.tsx
git commit -m "feat: add CSV upload step component with drag-and-drop"
```

---

## Task 9: Step 2 Review Component

**Files:**
- Create: `components/csv-import-steps/step2-review.tsx`

**Step 1: Create Step 2 component**

Create `components/csv-import-steps/step2-review.tsx`:

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { ParsedTransaction } from '@/lib/utils/csv-parser'
import type { Category, CategoryKeyword, MerchantPattern } from '@/lib/types'
import { matchCategories, type CategoryMatch } from '@/lib/utils/category-matcher'

type TransactionWithCategory = ParsedTransaction & {
  categoryId: string | null
  matchType: 'keyword' | 'historical' | 'none'
}

type Step2Props = {
  transactions: ParsedTransaction[]
  categories: Category[]
  keywordsByCategory: Record<string, CategoryKeyword[]>
  merchantPatterns: MerchantPattern[]
  onComplete: (transactions: TransactionWithCategory[]) => void
  onBack: () => void
}

export function Step2Review({
  transactions,
  categories,
  keywordsByCategory,
  merchantPatterns,
  onComplete,
  onBack,
}: Step2Props) {
  // Match categories on mount
  const initialMatches = useMemo(() => {
    const matches = matchCategories(transactions, keywordsByCategory, merchantPatterns)
    return transactions.map((tx, i) => ({
      ...tx,
      categoryId: matches[i].categoryId,
      matchType: matches[i].matchType,
    }))
  }, [transactions, keywordsByCategory, merchantPatterns])

  const [transactionsWithCategories, setTransactionsWithCategories] = useState<TransactionWithCategory[]>(initialMatches)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<'all' | 'uncategorized'>('all')

  const filteredTransactions = useMemo(() => {
    if (filter === 'uncategorized') {
      return transactionsWithCategories.filter(tx => !tx.categoryId)
    }
    return transactionsWithCategories
  }, [transactionsWithCategories, filter])

  const handleCategoryChange = (index: number, categoryId: string) => {
    setTransactionsWithCategories(prev =>
      prev.map((tx, i) =>
        i === index ? { ...tx, categoryId, matchType: 'none' as const } : tx
      )
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIndices(new Set(filteredTransactions.map((_, i) => i)))
    } else {
      setSelectedIndices(new Set())
    }
  }

  const handleSelectOne = (index: number, checked: boolean) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(index)
      } else {
        next.delete(index)
      }
      return next
    })
  }

  const handleBulkCategoryChange = (categoryId: string) => {
    setTransactionsWithCategories(prev =>
      prev.map((tx, i) =>
        selectedIndices.has(i) ? { ...tx, categoryId, matchType: 'none' as const } : tx
      )
    )
    setSelectedIndices(new Set())
  }

  const getRowColor = (tx: TransactionWithCategory) => {
    if (!tx.categoryId) return 'bg-yellow-50 dark:bg-yellow-950/20'
    if (tx.matchType === 'keyword') return 'bg-green-50 dark:bg-green-950/20'
    if (tx.matchType === 'historical') return 'bg-blue-50 dark:bg-blue-950/20'
    return ''
  }

  const uncategorizedCount = transactionsWithCategories.filter(tx => !tx.categoryId).length

  return (
    <div className="space-y-4">
      {/* Summary and controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {transactionsWithCategories.length} transactions
          {uncategorizedCount > 0 && ` (${uncategorizedCount} uncategorized)`}
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Show all</SelectItem>
            <SelectItem value="uncategorized">Show only uncategorized</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selectedIndices.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded">
          <span className="text-sm">{selectedIndices.size} selected</span>
          <Select onValueChange={handleBulkCategoryChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Apply category to selected" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Transaction table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="p-2 text-left">
                  <Checkbox
                    checked={selectedIndices.size === filteredTransactions.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-left">Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx, displayIndex) => {
                const actualIndex = transactionsWithCategories.indexOf(tx)
                return (
                  <tr key={actualIndex} className={getRowColor(tx)}>
                    <td className="p-2">
                      <Checkbox
                        checked={selectedIndices.has(actualIndex)}
                        onCheckedChange={(checked) => handleSelectOne(actualIndex, checked as boolean)}
                        aria-label={`Select transaction ${displayIndex + 1}`}
                      />
                    </td>
                    <td className="p-2">{tx.date}</td>
                    <td className="p-2 max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="p-2 text-right">${tx.amount.toFixed(2)}</td>
                    <td className="p-2">
                      <Select
                        value={tx.categoryId || ''}
                        onValueChange={(value) => handleCategoryChange(actualIndex, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 dark:bg-green-950/20 border" />
          <span>Matched by keyword</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 dark:bg-blue-950/20 border" />
          <span>Matched by history</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-50 dark:bg-yellow-950/20 border" />
          <span>Not matched - select manually</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={() => onComplete(transactionsWithCategories)}
          disabled={transactionsWithCategories.some(tx => !tx.categoryId)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Add missing Checkbox component**

Run:
```bash
npx shadcn@latest add checkbox -y
```

Expected: Checkbox component added

**Step 3: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 4: Commit**

```bash
git add components/csv-import-steps/step2-review.tsx components/ui/checkbox.tsx
git commit -m "feat: add review & categorize step with bulk actions"
```

---

## Task 10: Step 3 Duplicates Component

**Files:**
- Create: `components/csv-import-steps/step3-duplicates.tsx`

**Step 1: Create Step 3 component**

Create `components/csv-import-steps/step3-duplicates.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { ParsedTransaction } from '@/lib/utils/csv-parser'
import type { Transaction, Category } from '@/lib/types'
import { findDuplicates, type DuplicateMatch } from '@/lib/utils/duplicate-detector'

type TransactionWithCategory = ParsedTransaction & {
  categoryId: string
  matchType: 'keyword' | 'historical' | 'none'
}

type Step3Props = {
  transactions: TransactionWithCategory[]
  existingTransactions: Transaction[]
  categories: Category[]
  onComplete: (skipIndices: Set<number>) => void
  onBack: () => void
}

export function Step3Duplicates({
  transactions,
  existingTransactions,
  categories,
  onComplete,
  onBack,
}: Step3Props) {
  const duplicates = findDuplicates(transactions, existingTransactions)

  const [decisions, setDecisions] = useState<Map<number, 'skip' | 'import'>>(
    new Map(duplicates.map(d => [d.importIndex, 'skip']))
  )
  const [applyToAll, setApplyToAll] = useState(false)

  const handleDecision = (importIndex: number, decision: 'skip' | 'import') => {
    if (applyToAll) {
      // Apply this decision to all remaining duplicates
      const newDecisions = new Map(decisions)
      duplicates.forEach(d => {
        if (decisions.get(d.importIndex) === 'skip') {
          newDecisions.set(d.importIndex, decision)
        }
      })
      setDecisions(newDecisions)
    } else {
      setDecisions(prev => new Map(prev).set(importIndex, decision))
    }
  }

  const handleComplete = () => {
    const skipIndices = new Set<number>()
    decisions.forEach((decision, index) => {
      if (decision === 'skip') {
        skipIndices.add(index)
      }
    })
    onComplete(skipIndices)
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown'
  }

  if (duplicates.length === 0) {
    // No duplicates - skip this step
    handleComplete()
    return null
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Found {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''}. Review each one below.
      </div>

      <div className="flex items-center gap-2 p-2 bg-muted rounded">
        <Checkbox
          id="apply-to-all"
          checked={applyToAll}
          onCheckedChange={(checked) => setApplyToAll(checked as boolean)}
        />
        <label htmlFor="apply-to-all" className="text-sm cursor-pointer">
          Remember my choice for remaining duplicates
        </label>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {duplicates.map((dup, index) => {
          const newTx = transactions[dup.importIndex]
          const existingTx = dup.existingTransaction
          const decision = decisions.get(dup.importIndex) || 'skip'

          return (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="text-sm font-medium">
                Duplicate #{index + 1} ({dup.similarity}% similar)
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Existing transaction */}
                <div className="space-y-2 p-3 bg-muted/50 rounded">
                  <div className="text-xs font-medium text-muted-foreground">
                    Existing Transaction
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>Date: {existingTx.date}</div>
                    <div>Amount: ${existingTx.amount.toFixed(2)}</div>
                    <div className="truncate" title={existingTx.description || ''}>
                      Description: {existingTx.description}
                    </div>
                    <div>Category: {getCategoryName(existingTx.category_id)}</div>
                  </div>
                </div>

                {/* New transaction */}
                <div className="space-y-2 p-3 bg-primary/5 rounded">
                  <div className="text-xs font-medium text-muted-foreground">
                    New Transaction (CSV)
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>Date: {newTx.date}</div>
                    <div>Amount: ${newTx.amount.toFixed(2)}</div>
                    <div className="truncate" title={newTx.description}>
                      Description: {newTx.description}
                    </div>
                    <div>Category: {getCategoryName(newTx.categoryId)}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant={decision === 'skip' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDecision(dup.importIndex, 'skip')}
                >
                  Skip import
                </Button>
                <Button
                  variant={decision === 'import' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDecision(dup.importIndex, 'import')}
                >
                  Import anyway
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleComplete}>
          Next
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add components/csv-import-steps/step3-duplicates.tsx
git commit -m "feat: add duplicate handling step with side-by-side comparison"
```

---

## Task 11: Step 4 Confirm Component

**Files:**
- Create: `components/csv-import-steps/step4-confirm.tsx`

**Step 1: Create Step 4 component**

Create `components/csv-import-steps/step4-confirm.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { ParsedTransaction } from '@/lib/utils/csv-parser'
import type { Category } from '@/lib/types'
import { bulkImportTransactions, learnMerchantPattern } from '@/lib/actions/csv-import'

type TransactionWithCategory = ParsedTransaction & {
  categoryId: string
  matchType: 'keyword' | 'historical' | 'none'
}

type Step4Props = {
  transactions: TransactionWithCategory[]
  skipIndices: Set<number>
  categories: Category[]
  onComplete: () => void
  onBack: () => void
}

export function Step4Confirm({
  transactions,
  skipIndices,
  categories,
  onComplete,
  onBack,
}: Step4Props) {
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  const transactionsToImport = transactions.filter((_, i) => !skipIndices.has(i))

  const getCategoryBreakdown = () => {
    const breakdown: Record<string, number> = {}

    transactionsToImport.forEach(tx => {
      const categoryName = categories.find(c => c.id === tx.categoryId)?.name || 'Unknown'
      breakdown[categoryName] = (breakdown[categoryName] || 0) + 1
    })

    return Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5) // Top 5 categories
  }

  const handleImport = async () => {
    setIsImporting(true)
    setProgress(0)

    try {
      // Learn merchant patterns for manually categorized transactions
      const manuallyMatched = transactionsToImport.filter(tx => tx.matchType === 'none')
      for (const tx of manuallyMatched) {
        // Extract merchant name (simple heuristic)
        const merchantName = tx.description.split(/[\s-]+/).slice(0, 2).join(' ')
        await learnMerchantPattern(merchantName, tx.categoryId)
      }

      // Simulate progress during import
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90))
      }, 200)

      // Bulk import
      const importResult = await bulkImportTransactions(
        transactionsToImport.map(tx => ({
          categoryId: tx.categoryId,
          amount: tx.amount,
          description: tx.description,
          date: tx.date,
        }))
      )

      clearInterval(progressInterval)
      setProgress(100)
      setResult(importResult)

      // If all successful, auto-complete after 1 second
      if (importResult.failed === 0) {
        setTimeout(() => {
          onComplete()
        }, 1000)
      }
    } catch (error) {
      setResult({
        success: 0,
        failed: transactionsToImport.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      })
      setProgress(0)
    } finally {
      setIsImporting(false)
    }
  }

  const breakdown = getCategoryBreakdown()
  const skippedCount = skipIndices.size

  return (
    <div className="space-y-4">
      {!result ? (
        <>
          {/* Summary */}
          <div className="space-y-3">
            <div className="text-lg font-medium">
              Ready to import {transactionsToImport.length} transaction{transactionsToImport.length !== 1 ? 's' : ''}
            </div>

            {skippedCount > 0 && (
              <div className="text-sm text-muted-foreground">
                ({skippedCount} skipped as duplicate{skippedCount !== 1 ? 's' : ''})
              </div>
            )}

            {/* Category breakdown */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="text-sm font-medium">Category Breakdown (Top 5):</div>
              {breakdown.map(([category, count]) => (
                <div key={category} className="text-sm flex justify-between">
                  <span>{category}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
              {breakdown.length === 0 && (
                <div className="text-sm text-muted-foreground">No transactions to import</div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isImporting && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Importing transactions...</div>
              <Progress value={progress} />
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack} disabled={isImporting}>
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || transactionsToImport.length === 0}
            >
              {isImporting ? 'Importing...' : 'Import Transactions'}
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Results */}
          <div className="space-y-3">
            {result.failed === 0 ? (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-500 rounded-lg">
                <div className="text-lg font-medium text-green-900 dark:text-green-100">
                  Successfully imported {result.success} transaction{result.success !== 1 ? 's' : ''}!
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-500 rounded-lg">
                  <div className="text-lg font-medium text-yellow-900 dark:text-yellow-100">
                    Partial Success
                  </div>
                  <div className="text-sm mt-2">
                    <div>✓ Imported: {result.success}</div>
                    <div>✗ Failed: {result.failed}</div>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                    <div className="text-sm font-medium mb-2">Errors:</div>
                    <ul className="text-xs space-y-1">
                      {result.errors.map((error, i) => (
                        <li key={i} className="text-destructive">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={handleImport} disabled={isImporting}>
                  Retry Failed Transactions
                </Button>
              </div>
            )}
          </div>

          {result.failed === 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Closing wizard...
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add components/csv-import-steps/step4-confirm.tsx
git commit -m "feat: add confirm & import step with progress tracking"
```

---

## Task 12: Main Wizard Component

**Files:**
- Create: `components/csv-import-wizard.tsx`

**Step 1: Create main wizard component**

Create `components/csv-import-wizard.tsx`:

```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Step1Upload } from '@/components/csv-import-steps/step1-upload'
import { Step2Review } from '@/components/csv-import-steps/step2-review'
import { Step3Duplicates } from '@/components/csv-import-steps/step3-duplicates'
import { Step4Confirm } from '@/components/csv-import-steps/step4-confirm'
import type { ParseResult, ParsedTransaction } from '@/lib/utils/csv-parser'
import type { Category, CategoryKeyword, MerchantPattern, Transaction } from '@/lib/types'

type Step = 1 | 2 | 3 | 4

type TransactionWithCategory = ParsedTransaction & {
  categoryId: string
  matchType: 'keyword' | 'historical' | 'none'
}

type CSVImportWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  keywordsByCategory: Record<string, CategoryKeyword[]>
  merchantPatterns: MerchantPattern[]
  existingTransactions: Transaction[]
}

export function CSVImportWizard({
  open,
  onOpenChange,
  categories,
  keywordsByCategory,
  merchantPatterns,
  existingTransactions,
}: CSVImportWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [categorizedTransactions, setCategorizedTransactions] = useState<TransactionWithCategory[]>([])
  const [skipIndices, setSkipIndices] = useState<Set<number>>(new Set())

  const handleReset = () => {
    setStep(1)
    setParseResult(null)
    setCategorizedTransactions([])
    setSkipIndices(new Set())
  }

  const handleComplete = () => {
    onOpenChange(false)
    handleReset()
  }

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Upload CSV'
      case 2: return 'Review & Categorize'
      case 3: return 'Handle Duplicates'
      case 4: return 'Confirm Import'
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) handleReset()
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {getStepTitle()} ({step}/4)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <Step1Upload
              onComplete={(result) => {
                setParseResult(result)
                setStep(2)
              }}
            />
          )}

          {step === 2 && parseResult && (
            <Step2Review
              transactions={parseResult.transactions}
              categories={categories}
              keywordsByCategory={keywordsByCategory}
              merchantPatterns={merchantPatterns}
              onComplete={(transactions) => {
                setCategorizedTransactions(transactions)
                setStep(3)
              }}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step3Duplicates
              transactions={categorizedTransactions}
              existingTransactions={existingTransactions}
              categories={categories}
              onComplete={(indices) => {
                setSkipIndices(indices)
                setStep(4)
              }}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <Step4Confirm
              transactions={categorizedTransactions}
              skipIndices={skipIndices}
              categories={categories}
              onComplete={handleComplete}
              onBack={() => setStep(3)}
            />
          )}
        </div>

        {/* Show parse errors if any */}
        {step === 2 && parseResult && parseResult.errors.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-500 rounded-lg">
            <div className="text-sm font-medium mb-2">
              Successfully parsed {parseResult.summary.success}/{parseResult.summary.total} rows
              ({parseResult.summary.failed} skipped due to errors)
            </div>
            {parseResult.errors.length <= 5 ? (
              <ul className="text-xs space-y-1">
                {parseResult.errors.map((err, i) => (
                  <li key={i}>Row {err.rowNumber}: {err.message}</li>
                ))}
              </ul>
            ) : (
              <div className="text-xs">
                {parseResult.errors.slice(0, 3).map((err, i) => (
                  <div key={i}>Row {err.rowNumber}: {err.message}</div>
                ))}
                <div className="mt-1 text-muted-foreground">
                  ...and {parseResult.errors.length - 3} more errors
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add components/csv-import-wizard.tsx
git commit -m "feat: add main CSV import wizard with 4-step flow"
```

---

## Task 13: Integrate Wizard into Transactions Page

**Files:**
- Modify: `app/transactions/page.tsx`

**Step 1: Update transactions page**

In `app/transactions/page.tsx`, add imports at top:

```typescript
import { getAllKeywords } from '@/lib/actions/keywords'
import { getMerchantPatterns } from '@/lib/actions/csv-import'
import { CSVImportWizard } from '@/components/csv-import-wizard'
```

Modify the data fetching (around line 15):

```typescript
  const [transactions, categories, budgetData, keywordsByCategory, merchantPatterns] = await Promise.all([
    getTransactions(),
    getCategories(),
    getBudgetDataForWarnings(),
    getAllKeywords(),
    getMerchantPatterns(),
  ])
```

Add import button wrapper component at the end of the file:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CSVImportWizard } from '@/components/csv-import-wizard'
import type { Category, CategoryKeyword, MerchantPattern, Transaction } from '@/lib/types'

function ImportButton({
  categories,
  keywordsByCategory,
  merchantPatterns,
  transactions,
}: {
  categories: Category[]
  keywordsByCategory: Record<string, CategoryKeyword[]>
  merchantPatterns: MerchantPattern[]
  transactions: Transaction[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import CSV
      </Button>
      <CSVImportWizard
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        keywordsByCategory={keywordsByCategory}
        merchantPatterns={merchantPatterns}
        existingTransactions={transactions}
      />
    </>
  )
}
```

Update the header section (around line 24) to include import button:

```typescript
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Total: ${total.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2">
          <ImportButton
            categories={categories}
            keywordsByCategory={keywordsByCategory}
            merchantPatterns={merchantPatterns}
            transactions={transactions}
          />
          <TransactionForm
            categories={categories}
            trigger={<Button>+ Add Transaction</Button>}
            budgetMap={budgetData.budgetMap}
            spentMap={budgetData.spentMap}
          />
        </div>
      </div>
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add app/transactions/page.tsx
git commit -m "feat: integrate CSV import wizard into Transactions page"
```

---

## Task 14: Keyword Management UI

**Files:**
- Create: `components/keyword-management.tsx`

**Step 1: Create keyword management component**

Create `components/keyword-management.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { addKeyword, deleteKeyword } from '@/lib/actions/keywords'
import type { Category, CategoryKeyword } from '@/lib/types'
import { X } from 'lucide-react'

type KeywordManagementProps = {
  categories: Category[]
  keywordsByCategory: Record<string, CategoryKeyword[]>
}

export function KeywordManagement({
  categories,
  keywordsByCategory,
}: KeywordManagementProps) {
  const [newKeywords, setNewKeywords] = useState<Record<string, string>>({})
  const [isAdding, setIsAdding] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const handleAddKeyword = async (categoryId: string) => {
    const keyword = newKeywords[categoryId]?.trim()
    if (!keyword) return

    setIsAdding(prev => ({ ...prev, [categoryId]: true }))
    setError(null)

    try {
      await addKeyword(categoryId, keyword)
      setNewKeywords(prev => ({ ...prev, [categoryId]: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add keyword')
    } finally {
      setIsAdding(prev => ({ ...prev, [categoryId]: false }))
    }
  }

  const handleDeleteKeyword = async (keywordId: string) => {
    setError(null)
    try {
      await deleteKeyword(keywordId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete keyword')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === 'Enter') {
      handleAddKeyword(categoryId)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create categories first before adding keywords.
        </p>
      ) : (
        <div className="space-y-4">
          {categories.map(category => {
            const keywords = keywordsByCategory[category.id] || []

            return (
              <div key={category.id} className="p-4 border rounded-lg space-y-3">
                {/* Category header */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                    aria-hidden="true"
                  />
                  <span className="font-medium">{category.name}</span>
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-2">
                  {keywords.map(kw => (
                    <Badge key={kw.id} variant="secondary" className="gap-1">
                      {kw.keyword}
                      <button
                        onClick={() => handleDeleteKeyword(kw.id)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        aria-label={`Delete keyword ${kw.keyword}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {keywords.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No keywords yet
                    </span>
                  )}
                </div>

                {/* Add keyword input */}
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Add keyword..."
                    value={newKeywords[category.id] || ''}
                    onChange={(e) => setNewKeywords(prev => ({
                      ...prev,
                      [category.id]: e.target.value
                    }))}
                    onKeyPress={(e) => handleKeyPress(e, category.id)}
                    disabled={isAdding[category.id]}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddKeyword(category.id)}
                    disabled={!newKeywords[category.id]?.trim() || isAdding[category.id]}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add missing Badge component**

Run:
```bash
npx shadcn@latest add badge -y
```

Expected: Badge component added

**Step 3: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 4: Commit**

```bash
git add components/keyword-management.tsx components/ui/badge.tsx
git commit -m "feat: add keyword management UI for category matching"
```

---

## Task 15: Integrate Keyword Management into Settings

**Files:**
- Modify: `app/settings/page.tsx`

**Step 1: Update settings page**

In `app/settings/page.tsx`, add imports at top:

```typescript
import { getAllKeywords } from '@/lib/actions/keywords'
import { KeywordManagement } from '@/components/keyword-management'
```

Modify data fetching (around line 14):

```typescript
  const [categories, keywordsByCategory] = await Promise.all([
    getCategories(),
    getAllKeywords(),
  ])
```

Add new Card section after the "Manage Categories" card (after line 89):

```typescript
      {/* Import Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Import Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Add keywords to automatically categorize imported transactions. Keywords are case-insensitive and match anywhere in the description.
            </p>
            <KeywordManagement
              categories={categories}
              keywordsByCategory={keywordsByCategory}
            />
          </div>
        </CardContent>
      </Card>
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors

**Step 3: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: integrate keyword management into Settings page"
```

---

## Task 16: Final Testing & Documentation

**Files:**
- Create: `docs/features/csv-import.md`

**Step 1: Create feature documentation**

Create `docs/features/csv-import.md`:

```markdown
# CSV Transaction Import Feature

## Overview

Import bank transaction CSV files (Ally Bank format) with smart category matching and duplicate detection.

## User Guide

### 1. Upload CSV File

1. Go to Transactions page
2. Click "Import CSV" button
3. Drag and drop your Ally Bank CSV file or click to browse
4. File is validated and parsed client-side

### 2. Review & Categorize

- Transactions are automatically matched to categories using:
  - **Keyword rules** (green highlight) - Exact keyword matches from Settings
  - **Historical patterns** (blue highlight) - Based on past transactions
  - **Manual selection** (yellow highlight) - No match found
- Use bulk actions to categorize multiple transactions at once
- All suggestions can be edited

### 3. Handle Duplicates

- System detects potential duplicates (same date + amount + similar description)
- Review each duplicate side-by-side
- Choose to skip or import anyway
- Optional: Apply decision to all remaining duplicates

### 4. Confirm Import

- Review summary and category breakdown
- Click "Import Transactions"
- Progress bar shows import status
- System learns from manual categorizations for future imports

## Managing Keywords

1. Go to Settings page
2. Scroll to "Import Settings" section
3. For each category:
   - View existing keywords
   - Add new keywords (case-insensitive)
   - Delete keywords by clicking X

## Technical Details

- **CSV Format**: Ally Bank (Date, Time, Amount, Type, Description)
- **File Size Limit**: 5MB
- **Batch Size**: 100 transactions per batch
- **Duplicate Threshold**: 80% similarity
- **Client-Side Parsing**: No data sent to server until confirmed

## Error Handling

- Invalid file format → Clear error message
- Parse errors → Rows skipped, summary shown
- Duplicate detection → Manual review required
- Import failures → Partial success reported, retry option available
```

**Step 2: Manual testing checklist**

Test the complete flow:

1. **Upload Step**:
   - ✓ Drag and drop CSV file
   - ✓ Click to browse and select CSV file
   - ✓ Validate file type error (upload .txt file)
   - ✓ Validate file size error (upload >5MB file if possible)
   - ✓ Validate CSV format error (upload CSV with wrong columns)
   - ✓ Parse valid Ally Bank CSV successfully

2. **Review Step**:
   - ✓ Green highlights for keyword matches
   - ✓ Blue highlights for historical matches
   - ✓ Yellow highlights for unmatched
   - ✓ Change category for individual transaction
   - ✓ Select all checkbox works
   - ✓ Bulk category change works
   - ✓ Filter "Show only uncategorized" works
   - ✓ Parse error summary displayed if rows failed

3. **Duplicates Step**:
   - ✓ Detects duplicates correctly
   - ✓ Shows side-by-side comparison
   - ✓ "Skip import" decision works
   - ✓ "Import anyway" decision works
   - ✓ "Remember my choice" checkbox works
   - ✓ Skip step if no duplicates found

4. **Confirm Step**:
   - ✓ Summary shows correct count
   - ✓ Category breakdown accurate
   - ✓ Progress bar displays during import
   - ✓ Success message shows
   - ✓ Wizard closes automatically on success
   - ✓ Error handling for failed imports

5. **Keywords**:
   - ✓ Add keyword to category
   - ✓ Delete keyword from category
   - ✓ Prevent duplicate keywords
   - ✓ Keywords are case-insensitive

6. **Integration**:
   - ✓ Import button appears on Transactions page
   - ✓ Imported transactions appear in list
   - ✓ Keywords section appears in Settings page
   - ✓ Page revalidates after import

**Step 3: Verify build**

Run: `npm run build`
Expected: TypeScript compiles without errors, all routes build successfully

**Step 4: Commit**

```bash
git add docs/features/csv-import.md
git commit -m "docs: add CSV import feature documentation and testing checklist"
```

---

## Success Criteria

All must be ✓ before marking complete:

- [ ] Dependencies installed (papaparse, fuzzball)
- [ ] Database tables created (category_keywords, merchant_patterns)
- [ ] TypeScript types updated
- [ ] All server actions implemented and working
- [ ] All utility functions implemented and tested
- [ ] All 4 wizard steps functional
- [ ] Wizard integrates into Transactions page
- [ ] Keyword management integrates into Settings page
- [ ] CSV parsing handles Ally Bank format correctly
- [ ] Category matching works for both keywords and history
- [ ] Duplicate detection prevents re-imports
- [ ] Bulk import handles batches correctly
- [ ] Merchant learning happens on import
- [ ] All error cases handled gracefully
- [ ] Build completes without errors
- [ ] Feature documentation complete

---

## Notes for Implementation

**IMPORTANT**: Apply database migrations manually if `npx supabase` CLI is not configured. Use Supabase dashboard SQL editor to run the migration in Task 2.

**Testing with real data**: Use the CSV file at `/Users/tylereck/Downloads/transactions.csv` for testing the complete flow.

**Error handling**: Each step should handle errors gracefully and show user-friendly messages. Network errors should offer retry options.

**Performance**: The 100-transaction batch size ensures imports complete within Next.js timeout limits. For larger files, consider showing progress more granularly.

**Learning**: Merchant patterns are only learned from manually categorized transactions (matchType === 'none'), not from keyword or historical matches, to avoid reinforcing incorrect auto-matches.
