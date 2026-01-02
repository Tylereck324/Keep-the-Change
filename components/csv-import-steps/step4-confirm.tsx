'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert } from '@/components/ui/alert'
import {
  bulkImportTransactions,
  learnMerchantPattern,
  type BulkImportTransaction,
} from '@/lib/actions/csv-import'
import type { Category } from '@/lib/types'
import type { ReviewedTransaction } from './step2-review'

interface Step4ConfirmProps {
  transactions: ReviewedTransaction[]
  categories: Category[]
  onComplete: () => void
  onBack: () => void
}

export function Step4Confirm({
  transactions,
  categories,
  onComplete,
  onBack,
}: Step4ConfirmProps) {
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    success: boolean
    imported: number
    failed: number
    errors: Array<{ index: number; message: string }>
  } | null>(null)

  // Calculate summary statistics
  const summary = useMemo(() => {
    const total = transactions.length

    // Count by category
    const byCategory: Record<string, number> = {}
    transactions.forEach((txn) => {
      if (txn.categoryId) {
        byCategory[txn.categoryId] = (byCategory[txn.categoryId] || 0) + 1
      }
    })

    // Get top 5 categories
    const categoryBreakdown = Object.entries(byCategory)
      .map(([categoryId, count]) => {
        const category = categories.find((c) => c.id === categoryId)
        return {
          categoryId,
          categoryName: category?.name || 'Unknown',
          categoryColor: category?.color || '#6366f1',
          count,
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      total,
      categoryBreakdown,
    }
  }, [transactions, categories])

  // Extract merchant name from description
  const extractMerchantName = (description: string): string => {
    // Remove common payment processors
    const cleaned = description.replace(/^(PAYPAL \*|KLARNA\*|DD \*)/i, '')

    // Take first part before common separators
    const parts = cleaned.split(/[\s-]+/)

    // Return first 1-2 words as merchant name
    return parts.slice(0, 2).join(' ').trim().toLowerCase()
  }

  const handleImport = async () => {
    setImporting(true)
    setProgress(0)

    try {
      // Convert to import format
      const importData: BulkImportTransaction[] = transactions.map((txn) => ({
        categoryId: txn.categoryId!,
        amount: txn.amount,
        description: txn.description,
        date: txn.date,
      }))

      // Simulate progress during import
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      // Import transactions
      const importResult = await bulkImportTransactions(importData)

      clearInterval(progressInterval)
      setProgress(95)

      // Learn patterns for manually categorized transactions
      const manualTransactions = transactions.filter(
        (txn) => txn.matchType === 'none' && txn.categoryId
      )

      for (const txn of manualTransactions) {
        try {
          const merchantName = extractMerchantName(txn.description)
          if (merchantName) {
            await learnMerchantPattern(merchantName, txn.categoryId!)
          }
        } catch (err) {
          // Ignore individual pattern learning errors
          console.error('Failed to learn pattern:', err)
        }
      }

      setProgress(100)
      setResult(importResult)

      // Auto-close on success after 1 second
      if (importResult.success) {
        setTimeout(() => {
          onComplete()
        }, 1000)
      }
    } catch (err) {
      setResult({
        success: false,
        imported: 0,
        failed: transactions.length,
        errors: [
          {
            index: 0,
            message: err instanceof Error ? err.message : 'Import failed',
          },
        ],
      })
      setProgress(0)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Confirm Import</h2>
        <p className="text-muted-foreground">
          Review the summary and confirm to import these transactions.
        </p>
      </div>

      {/* Summary */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Import Summary</h3>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Total transactions</div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">
              Top categories
            </div>
            <div className="space-y-2">
              {summary.categoryBreakdown.map((cat) => (
                <div key={cat.categoryId} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.categoryColor }}
                  />
                  <span className="text-sm flex-1">{cat.categoryName}</span>
                  <span className="text-sm font-medium">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Import progress */}
      {importing && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Importing...</h3>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            {progress < 95
              ? 'Importing transactions...'
              : 'Learning merchant patterns...'}
          </p>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <div className="space-y-2">
            {result.success ? (
              <>
                <p className="font-semibold">Import successful!</p>
                <p className="text-sm">
                  Imported {result.imported} transaction{result.imported !== 1 ? 's' : ''}.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Import failed</p>
                <p className="text-sm">
                  Imported {result.imported}, Failed {result.failed}
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-2 text-sm space-y-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <div key={i}>
                        Row {err.index + 1}: {err.message}
                      </div>
                    ))}
                    {result.errors.length > 5 && (
                      <div>...and {result.errors.length - 5} more errors</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          Back
        </Button>
        <Button
          onClick={handleImport}
          disabled={importing || result?.success}
        >
          {importing
            ? 'Importing...'
            : result?.success
            ? 'Import complete'
            : 'Confirm & Import'}
        </Button>
      </div>
    </div>
  )
}
