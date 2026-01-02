'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CategoryForm } from './category-form'
import { deleteCategory } from '@/lib/actions/categories'
import { Category, MonthlyBudget } from '@/lib/types'

interface CategoryCardProps {
  category: Category
  budget?: MonthlyBudget
  spent: number
}

export function CategoryCard({ category, budget, spent }: CategoryCardProps) {
  const [deleting, setDeleting] = useState(false)

  const budgeted = budget?.budgeted_amount ?? 0
  const remaining = budgeted - spent
  const percentUsed = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0

  const getProgressColor = () => {
    if (percentUsed >= 100) return '#ef4444'
    if (percentUsed >= 75) return '#eab308'
    return '#22c55e'
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteCategory(category.id)
      toast.success(`Category "${category.name}" deleted`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />
            <CardTitle className="text-lg">{category.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            <CategoryForm
              category={category}
              trigger={
                <Button variant="ghost" size="sm" aria-label={`Edit ${category.name} category`}>
                  Edit
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleting}
                  aria-label={`Delete ${category.name} category`}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete &quot;{category.name}&quot;?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Any transactions using this category will become uncategorized.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Category
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>${spent.toFixed(2)} spent</span>
            <span>${budgeted.toFixed(2)} budgeted</span>
          </div>
          <Progress value={percentUsed} className="h-2" style={{ ['--progress-color' as string]: getProgressColor() }} />
          <p className={`text-sm ${remaining < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            ${Math.abs(remaining).toFixed(2)} {remaining < 0 ? 'over budget' : 'remaining'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
