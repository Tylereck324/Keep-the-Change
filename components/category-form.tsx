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
import { createCategory, updateCategory } from '@/lib/actions/categories'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
]

interface CategoryFormProps {
  category?: { id: string; name: string; color: string }
  trigger: React.ReactNode
  onSuccess?: () => void
}

export function CategoryForm({ category, trigger, onSuccess }: CategoryFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!category

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
      } else {
        await createCategory(name.trim(), color)
      }
      setOpen(false)
      setName('')
      setColor(COLORS[0])
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
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
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
