'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { matchCategory, type MatchType } from '@/lib/utils/category-matcher'
import type { ParsedTransaction } from '@/lib/utils/csv-parser'
import type { Category, CategoryKeyword, MerchantPattern } from '@/lib/types'

export type ReviewedTransaction = ParsedTransaction & {
  categoryId: string | null
  matchType: MatchType
}

interface Step2ReviewProps {
  transactions: ParsedTransaction[]
  categories: Category[]
  keywordsByCategory: Record<string, CategoryKeyword[]>
  merchantPatterns: MerchantPattern[]
  onComplete: (transactions: ReviewedTransaction[]) => void
  onBack: () => void
}

export function Step2Review({
  transactions,
  categories,
  keywordsByCategory,
  merchantPatterns,
  onComplete,
  onBack,
}: Step2ReviewProps) {
  const [reviewedTransactions, setReviewedTransactions] = useState<ReviewedTransaction[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'uncategorized'>('all')

  // Auto-match categories on mount
  useEffect(() => {
    const matched = transactions.map((txn) => {
      const match = matchCategory(
        txn.description,
        keywordsByCategory,
        merchantPatterns
      )
      return {
        ...txn,
        categoryId: match.categoryId,
        matchType: match.matchType,
      }
    })
    setReviewedTransactions(matched)
  }, [transactions, keywordsByCategory, merchantPatterns])

  const handleCategoryChange = (index: number, categoryId: string) => {
    setReviewedTransactions((prev) =>
      prev.map((txn, i) =>
        i === index
          ? { ...txn, categoryId, matchType: 'none' as MatchType }
          : txn
      )
    )
  }

  const handleRowSelect = (index: number, checked: boolean) => {
    setSelectedRows((prev) => {
      const updated = new Set(prev)
      if (checked) {
        updated.add(index)
      } else {
        updated.delete(index)
      }
      return updated
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(
        reviewedTransactions.map((_, i) => i)
      )
      setSelectedRows(allIndices)
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleBulkAssign = () => {
    if (!bulkCategoryId) return

    setReviewedTransactions((prev) =>
      prev.map((txn, i) =>
        selectedRows.has(i)
          ? { ...txn, categoryId: bulkCategoryId, matchType: 'none' as MatchType }
          : txn
      )
    )

    // Clear selections and bulk category
    setSelectedRows(new Set())
    setBulkCategoryId('')
  }

  const getRowColor = (matchType: MatchType) => {
    switch (matchType) {
      case 'keyword':
        return 'bg-green-50 dark:bg-green-950/20'
      case 'historical':
        return 'bg-blue-50 dark:bg-blue-950/20'
      case 'none':
        return 'bg-yellow-50 dark:bg-yellow-950/20'
      default:
        return ''
    }
  }

  const filteredTransactions = useMemo(() => {
    if (filter === 'uncategorized') {
      return reviewedTransactions.map((txn, i) => ({ txn, index: i })).filter(
        ({ txn }) => !txn.categoryId
      )
    }
    return reviewedTransactions.map((txn, i) => ({ txn, index: i }))
  }, [reviewedTransactions, filter])

  const allCategorized = reviewedTransactions.every((txn) => txn.categoryId)
  const hasSelections = selectedRows.size > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Review & Categorize</h2>
        <p className="text-muted-foreground">
          {reviewedTransactions.length} transactions found. Assign categories before importing.
        </p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-800" />
          <span className="text-muted-foreground">Keyword match</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800" />
          <span className="text-muted-foreground">Historical match</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800" />
          <span className="text-muted-foreground">No match</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Show all
        </Button>
        <Button
          variant={filter === 'uncategorized' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('uncategorized')}
        >
          Show only uncategorized
        </Button>
      </div>

      {/* Bulk actions */}
      {hasSelections && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedRows.size} selected
          </span>
          <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleBulkAssign}
            disabled={!bulkCategoryId}
            size="sm"
          >
            Assign to selected
          </Button>
        </div>
      )}

      {/* Transactions table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="p-2 text-left">
                  <Checkbox
                    checked={selectedRows.size === reviewedTransactions.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="p-2 text-left text-sm font-medium">Date</th>
                <th className="p-2 text-left text-sm font-medium">Description</th>
                <th className="p-2 text-right text-sm font-medium">Amount</th>
                <th className="p-2 text-left text-sm font-medium">Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(({ txn, index }) => (
                <tr
                  key={index}
                  className={`border-t ${getRowColor(txn.matchType)}`}
                >
                  <td className="p-2">
                    <Checkbox
                      checked={selectedRows.has(index)}
                      onCheckedChange={(checked) =>
                        handleRowSelect(index, checked as boolean)
                      }
                    />
                  </td>
                  <td className="p-2 text-sm">{txn.date}</td>
                  <td className="p-2 text-sm">{txn.description}</td>
                  <td className="p-2 text-sm text-right">
                    ${txn.amount.toFixed(2)}
                  </td>
                  <td className="p-2">
                    <Select
                      value={txn.categoryId || ''}
                      onValueChange={(value) =>
                        handleCategoryChange(index, value)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={() => onComplete(reviewedTransactions)}
          disabled={!allCategorized}
        >
          {allCategorized
            ? 'Continue to duplicates check'
            : 'All transactions must have a category'}
        </Button>
      </div>
    </div>
  )
}
