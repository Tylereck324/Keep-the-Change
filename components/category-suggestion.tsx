'use client'

import { CategorySuggestion as CategorySuggestionType } from '@/lib/utils/budget-warnings'

interface CategorySuggestionProps {
  suggestion: CategorySuggestionType
  onSelect: () => void
}

export function CategorySuggestion({ suggestion, onSelect }: CategorySuggestionProps) {
  const indicatorEmoji = {
    green: '🟢',
    yellow: '🟡',
    red: '🔴',
  }[suggestion.indicator]

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center justify-between p-2 rounded hover:bg-accent transition-colors text-left"
    >
      <div className="flex items-center gap-2">
        <span>{indicatorEmoji}</span>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: suggestion.categoryColor }}
        />
        <span className="font-medium">{suggestion.categoryName}</span>
      </div>
      <span className="text-sm text-muted-foreground">
        ${suggestion.remaining.toFixed(2)} left
      </span>
    </button>
  )
}
