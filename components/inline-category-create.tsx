'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCategory } from '@/lib/actions/categories'
import type { Category } from '@/lib/types'

interface InlineCategoryCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoryCreated: (category: Category) => void
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
]

export function InlineCategoryCreate({
  open,
  onOpenChange,
  onCategoryCreated,
}: InlineCategoryCreateProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Category name is required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const newCategory = await createCategory(name.trim(), color)
      onCategoryCreated(newCategory)
      // Reset form
      setName('')
      setColor(PRESET_COLORS[0])
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    setName('')
    setColor(PRESET_COLORS[0])
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries"
              maxLength={100}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === presetColor
                      ? 'border-foreground'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                  disabled={isCreating}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
