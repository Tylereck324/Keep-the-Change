'use client'

import { Category } from '@/lib/types'
import { CategorySuggestion as CategorySuggestionType } from '@/lib/utils/budget-warnings'
import { CategorySuggestion } from './category-suggestion'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'

interface BudgetWarningProps {
  categoryName: string
  overage: number
  suggestions: CategorySuggestionType[]
  onKeep: () => void
  onSwitchCategory: (categoryId: string) => void
}

export function BudgetWarning({
  categoryName,
  overage,
  suggestions,
  onKeep,
  onSwitchCategory,
}: BudgetWarningProps) {
  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <AlertDescription>
        <div className="space-y-3">
          {/* Warning Message */}
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">
                This will exceed your {categoryName} budget by ${overage.toFixed(2)}
              </p>
              {suggestions.length > 0 && (
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  Suggest using a different category?
                </p>
              )}
            </div>
          </div>

          {/* Category Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <CategorySuggestion
                  key={suggestion.categoryId}
                  suggestion={suggestion}
                  onSelect={() => onSwitchCategory(suggestion.categoryId)}
                />
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onKeep}
              className="flex-1"
            >
              Keep {categoryName}
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
