'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CSVImportWizard } from '@/components/csv-import-wizard'
import type { Category, CategoryKeyword, MerchantPattern, Transaction } from '@/lib/types'

interface ImportButtonProps {
  categories: Category[]
  keywordsByCategory: Record<string, CategoryKeyword[]>
  merchantPatterns: MerchantPattern[]
  existingTransactions: Transaction[]
}

export function ImportButton({
  categories,
  keywordsByCategory,
  merchantPatterns,
  existingTransactions,
}: ImportButtonProps) {
  const [open, setOpen] = useState(false)
  const hasNoCategories = categories.length === 0

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={hasNoCategories}
        title={hasNoCategories ? 'You must create at least one category before importing transactions. Go to Settings to add categories.' : undefined}
      >
        Import CSV
      </Button>
      <CSVImportWizard
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        keywordsByCategory={keywordsByCategory}
        merchantPatterns={merchantPatterns}
        existingTransactions={existingTransactions}
      />
    </>
  )
}
