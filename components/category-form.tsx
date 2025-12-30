'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createCategory, updateCategory } from '@/lib/actions/categories'

import { CATEGORY_COLORS } from '@/lib/constants'
import { DeleteCategoryDialog } from './delete-category-dialog'

interface CategoryFormProps {
  category?: { id: string; name: string; color: string }
  trigger: React.ReactNode
  onSuccess?: () => void
  onDelete?: () => void
}

export function CategoryForm({ category, trigger, onSuccess, onDelete }: CategoryFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!category
  // ... rest of the file

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        await updateCategory(category.id, name.trim(), color)
        toast.success('Category updated')
      } else {
        await createCategory(name.trim(), color)
        toast.success('Category created')
      }
      setOpen(false)
      if (!isEditing) {
        setName('')
        setColor(CATEGORY_COLORS[0])
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      toast.error('Failed to save category')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Select color ${c}`}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
            </Button>
            {isEditing && onDelete && (
              <DeleteCategoryDialog
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={loading}
                  >
                    Delete
                  </Button>
                }
                onConfirm={onDelete}
                loading={loading}
              />
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
