'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { findDuplicates, type DuplicateMatch } from '@/lib/utils/duplicate-detector'
import type { Transaction } from '@/lib/types'
import type { ReviewedTransaction } from './step2-review'

interface Step3DuplicatesProps {
  transactions: ReviewedTransaction[]
  existingTransactions: Transaction[]
  onComplete: (transactionsToImport: ReviewedTransaction[]) => void
  onBack: () => void
}

export function Step3Duplicates({
  transactions,
  existingTransactions,
  onComplete,
  onBack,
}: Step3DuplicatesProps) {
  const [decisions, setDecisions] = useState<Record<number, 'skip' | 'import'>>({})
  const [rememberChoice, setRememberChoice] = useState<'skip' | 'import' | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const duplicates = useMemo(
    () => findDuplicates(transactions, existingTransactions),
    [transactions, existingTransactions]
  )

  // Auto-skip this step if no duplicates
  useEffect(() => {
    if (duplicates.length === 0) {
      onComplete(transactions)
    }
  }, [duplicates.length, onComplete, transactions])

  const currentDuplicate = duplicates[currentIndex]
  const currentTransaction = currentDuplicate
    ? transactions[currentDuplicate.importIndex]
    : null

  const handleDecision = (decision: 'skip' | 'import', remember: boolean) => {
    if (!currentDuplicate) return

    // If user wants to remember, apply to all remaining duplicates
    if (remember) {
      setRememberChoice(decision)
      const remaining = duplicates.slice(currentIndex + 1)
      const bulkDecisions = remaining.reduce(
        (acc, dup) => ({
          ...acc,
          [dup.importIndex]: decision,
        }),
        {}
      )
      const nextDecisions = {
        ...decisions,
        [currentDuplicate.importIndex]: decision,
        ...bulkDecisions,
      }
      setDecisions(nextDecisions)

      // Jump to finish with computed decisions
      handleFinish(nextDecisions)
      return
    }

    // Record this decision
    setDecisions((prev) => ({
      ...prev,
      [currentDuplicate.importIndex]: decision,
    }))

    // Move to next duplicate or finish
    if (currentIndex < duplicates.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleFinish()
    }
  }

  const handleFinish = (decisionsOverride?: Record<number, 'skip' | 'import'>) => {
    const decisionsToUse = decisionsOverride ?? decisions
    // Get indices to skip
    const skipIndices = new Set(
      Object.entries(decisionsToUse)
        .filter(([_, decision]) => decision === 'skip')
        .map(([index]) => parseInt(index))
    )

    // Filter out skipped transactions
    const transactionsToImport = transactions.filter(
      (_, index) => !skipIndices.has(index)
    )

    onComplete(transactionsToImport)
  }

  // If no duplicates, this step is skipped automatically
  if (duplicates.length === 0) {
    return null
  }

  const progress = currentIndex + 1
  const total = duplicates.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Duplicate Check</h2>
        <p className="text-muted-foreground">
          Found {total} potential duplicate{total !== 1 ? 's' : ''}. Review each one.
        </p>
      </div>

      {/* Progress */}
      <div className="text-sm text-muted-foreground">
        Reviewing {progress} of {total}
      </div>

      {currentTransaction && currentDuplicate && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* New Transaction */}
          <Card className="p-6 border-2 border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold mb-4 text-blue-600 dark:text-blue-400">
              New Transaction (Importing)
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>{' '}
                <span className="font-medium">{currentTransaction.date}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>{' '}
                <span className="font-medium">
                  ${currentTransaction.amount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Description:</span>{' '}
                <span className="font-medium">{currentTransaction.description}</span>
              </div>
            </div>
          </Card>

          {/* Existing Transaction */}
          <Card className="p-6 border-2 border-amber-200 dark:border-amber-800">
            <h3 className="text-sm font-semibold mb-4 text-amber-600 dark:text-amber-400">
              Existing Transaction (Already in system)
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>{' '}
                <span className="font-medium">
                  {currentDuplicate.existingTransaction.date}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>{' '}
                <span className="font-medium">
                  ${currentDuplicate.existingTransaction.amount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Description:</span>{' '}
                <span className="font-medium">
                  {currentDuplicate.existingTransaction.description}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Similarity:</span>{' '}
                <span className="font-medium">
                  {currentDuplicate.similarity}%
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Decision buttons */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleDecision('skip', false)}
          >
            Skip import
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleDecision('import', false)}
          >
            Import anyway
          </Button>
        </div>

        {/* Remember choice */}
        {currentIndex < duplicates.length - 1 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-skip"
                checked={rememberChoice === 'skip'}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleDecision('skip', true)
                  } else {
                    setRememberChoice(null)
                  }
                }}
              />
              <label htmlFor="remember-skip" className="cursor-pointer">
                Skip all remaining duplicates
              </label>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Checkbox
                id="remember-import"
                checked={rememberChoice === 'import'}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleDecision('import', true)
                  } else {
                    setRememberChoice(null)
                  }
                }}
              />
              <label htmlFor="remember-import" className="cursor-pointer">
                Import all remaining duplicates
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button variant="ghost" onClick={handleFinish}>
          Skip to confirm ({Object.keys(decisions).length}/{total} reviewed)
        </Button>
      </div>
    </div>
  )
}
