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

  const isOverBudget = suggestion.remaining < 0
  const remainingText = isOverBudget
    ? `$${Math.abs(suggestion.remaining).toFixed(2)} over budget`
    : `$${suggestion.remaining.toFixed(2)} left`

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Select ${suggestion.categoryName} category`}
      className="w-full flex items-center justify-between p-2 rounded hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-2">
        <span>{indicatorEmoji}</span>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: suggestion.categoryColor }}
          aria-hidden="true"
        />
        <span className="font-medium">{suggestion.categoryName}</span>
      </div>
      <span className="text-sm text-muted-foreground">
        {remainingText}
      </span>
    </button>
  )
}
