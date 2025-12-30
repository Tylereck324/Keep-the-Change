'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CategoryForm } from './category-form'
import { DeleteCategoryDialog } from './delete-category-dialog'
import { BudgetAmountInput } from './budget-amount-input'
import { Category, MonthlyBudget } from '@/lib/types'
import { deleteCategory, restoreCategory } from '@/lib/actions/categories'
import { toast } from 'sonner'

interface BudgetCategoryRowProps {
  category: Category
  budget?: MonthlyBudget
  month: string
}

export function BudgetCategoryRow({ category, budget, month }: BudgetCategoryRowProps) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const isArchived = !!category.deleted_at

  const handleArchive = async () => {
    setProcessing(true)
    try {
      await deleteCategory(category.id)
      toast.success('Category archived')
      setArchiveDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive')
    } finally {
      setProcessing(false)
    }
  }

  const handleRestore = async () => {
    setProcessing(true)
    try {
      await restoreCategory(category.id)
      toast.success('Category restored')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card className={isArchived ? 'opacity-60 bg-muted/50' : ''}>
      <CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className={`font-medium ${isArchived ? 'line-through decoration-muted-foreground/50' : ''}`}>
            {category.name}
          </span>
          <div className="flex gap-1">
            {!isArchived && (
              <CategoryForm
                category={category}
                trigger={
                  <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      <path d="m15 5 4 4"/>
                    </svg>
                    <span className="sr-only">Edit</span>
                  </button>
                }
              />
            )}
            {isArchived ? (
              <button 
                onClick={handleRestore}
                className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted"
                disabled={processing}
                title="Restore category"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                <span className="sr-only">Restore</span>
              </button>
            ) : (
              <DeleteCategoryDialog
                open={archiveDialogOpen}
                onOpenChange={setArchiveDialogOpen}
                trigger={
                  <button 
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted"
                    disabled={processing}
                    title="Archive category"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2"/>
                      <path d="M10 12h4"/>
                    </svg>
                    <span className="sr-only">Archive</span>
                  </button>
                }
                onConfirm={handleArchive}
                loading={processing}
              />
            )}
          </div>
        </div>
        {!isArchived && (
          <BudgetAmountInput
            categoryId={category.id}
            month={month}
            initialAmount={budget?.budgeted_amount ?? 0}
          />
        )}
      </CardContent>
    </Card>
  )
}
