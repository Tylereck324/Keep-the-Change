'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Step1Upload } from '@/components/csv-import-steps/step1-upload'
import { Step2Review, type ReviewedTransaction } from '@/components/csv-import-steps/step2-review'
import { Step3Duplicates } from '@/components/csv-import-steps/step3-duplicates'
import { Step4Confirm } from '@/components/csv-import-steps/step4-confirm'
import type { ParseResult } from '@/lib/utils/csv-parser'
import type { Category, CategoryKeyword, MerchantPattern, Transaction } from '@/lib/types'

interface CSVImportWizardProps {
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [reviewedTransactions, setReviewedTransactions] = useState<ReviewedTransaction[]>([])
  const [transactionsToImport, setTransactionsToImport] = useState<ReviewedTransaction[]>([])

  const handleStep1Complete = (result: ParseResult) => {
    setParseResult(result)
    setStep(2)
  }

  const handleStep2Complete = (transactions: ReviewedTransaction[]) => {
    setReviewedTransactions(transactions)
    setStep(3)
  }

  const handleStep3Complete = (transactions: ReviewedTransaction[]) => {
    setTransactionsToImport(transactions)
    setStep(4)
  }

  const handleStep4Complete = () => {
    // Import successful, close dialog
    handleClose()
  }

  const handleClose = () => {
    // Reset state when closing
    setStep(1)
    setParseResult(null)
    setReviewedTransactions([])
    setTransactionsToImport([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {/* Step 1: Upload CSV file */}
          {step === 1 && <Step1Upload onComplete={handleStep1Complete} />}

          {/* Step 2: Review and categorize transactions */}
          {step === 2 && parseResult && (
            <Step2Review
              transactions={parseResult.transactions}
              categories={categories}
              keywordsByCategory={keywordsByCategory}
              merchantPatterns={merchantPatterns}
              onComplete={handleStep2Complete}
              onBack={() => setStep(1)}
            />
          )}

          {/* Step 3: Handle duplicates */}
          {step === 3 && (
            <Step3Duplicates
              transactions={reviewedTransactions}
              existingTransactions={existingTransactions}
              onComplete={handleStep3Complete}
              onBack={() => setStep(2)}
            />
          )}

          {/* Step 4: Confirm and import */}
          {step === 4 && (
            <Step4Confirm
              transactions={transactionsToImport}
              categories={categories}
              onComplete={handleStep4Complete}
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
