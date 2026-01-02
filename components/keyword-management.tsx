'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { addKeyword, deleteKeyword } from '@/lib/actions/keywords'
import type { Category, CategoryKeyword } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface KeywordManagementProps {
  categories: Category[]
  keywordsByCategory: Record<string, CategoryKeyword[]>
}

export function KeywordManagement({
  categories,
  keywordsByCategory,
}: KeywordManagementProps) {
  const router = useRouter()
  const [newKeywords, setNewKeywords] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddKeyword = async (categoryId: string) => {
    const keyword = newKeywords[categoryId]?.trim()
    if (!keyword) return

    setLoading(categoryId)
    setError(null)

    try {
      await addKeyword(categoryId, keyword)
      setNewKeywords((prev) => ({ ...prev, [categoryId]: '' }))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add keyword')
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteKeyword = async (keywordId: string) => {
    setLoading(keywordId)
    setError(null)

    try {
      await deleteKeyword(keywordId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete keyword')
    } finally {
      setLoading(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, categoryId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword(categoryId)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories available. Create categories first to add keywords.
        </p>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            const keywords = keywordsByCategory[category.id] || []
            const inputValue = newKeywords[category.id] || ''
            const isLoading = loading === category.id

            return (
              <div key={category.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <h3 className="font-semibold">{category.name}</h3>
                </div>

                {/* Display keywords */}
                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                  {keywords.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      No keywords yet
                    </span>
                  ) : (
                    keywords.map((keyword) => (
                      <Badge
                        key={keyword.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {keyword.keyword}
                        <button
                          onClick={() => handleDeleteKeyword(keyword.id)}
                          disabled={loading === keyword.id}
                          className="ml-1 hover:text-red-500 transition-colors disabled:opacity-50"
                          aria-label="Delete keyword"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                {/* Add keyword input */}
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) =>
                      setNewKeywords((prev) => ({
                        ...prev,
                        [category.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => handleKeyDown(e, category.id)}
                    placeholder="Add keyword..."
                    disabled={isLoading}
                    className="max-w-xs"
                  />
                  <Button
                    onClick={() => handleAddKeyword(category.id)}
                    disabled={!inputValue || isLoading}
                    size="sm"
                  >
                    {isLoading ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
        <p className="font-medium mb-2">How keyword matching works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Keywords are matched case-insensitively against transaction descriptions</li>
          <li>Add common merchants, stores, or description patterns</li>
          <li>Examples: &quot;starbucks&quot;, &quot;amazon&quot;, &quot;gas&quot;, &quot;grocery&quot;</li>
          <li>Keywords help auto-categorize imported transactions</li>
        </ul>
      </div>
    </div>
  )
}
