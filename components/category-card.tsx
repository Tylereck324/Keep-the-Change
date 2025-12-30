'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CategoryForm } from './category-form'
import { deleteCategory } from '@/lib/actions/categories'
import { Category, MonthlyBudget } from '@/lib/types'
import { toast } from 'sonner'
import { DeleteCategoryDialog } from './delete-category-dialog'

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
    if (percentUsed >= 100) return 'bg-red-500'
    if (percentUsed >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteCategory(category.id)
      toast.success('Category deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
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
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <CardTitle className="text-lg">{category.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            <CategoryForm
              category={category}
              trigger={<Button variant="ghost" size="sm">Edit</Button>}
              onDelete={handleDelete}
            />
            <DeleteCategoryDialog
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleting}
                >
                  Delete
                </Button>
              }
              onConfirm={handleDelete}
              loading={deleting}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>${spent.toFixed(2)} spent</span>
            <span>${budgeted.toFixed(2)} budgeted</span>
          </div>
          <Progress value={percentUsed} className={getProgressColor()} />
          <p className={`text-sm ${remaining < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
            ${Math.abs(remaining).toFixed(2)} {remaining < 0 ? 'over budget' : 'remaining'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
