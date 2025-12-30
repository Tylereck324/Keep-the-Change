'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { RecurringCharge } from '@/lib/actions/insights'

interface RecurringCardProps {
  charge: RecurringCharge
}

export function RecurringCard({ charge }: RecurringCardProps) {
  const frequencyLabels = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
  }

  const frequencyColors = {
    weekly: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    monthly: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    quarterly: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card className={!charge.isActive ? 'opacity-60' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate text-gray-900 dark:text-gray-100">{charge.displayName}</h3>
            {charge.category && (
              <div className="flex items-center gap-1 mt-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: charge.category.color }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{charge.category.name}</span>
              </div>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${frequencyColors[charge.frequency]}`}>
            {frequencyLabels[charge.frequency]}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">${charge.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Monthly Est.</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">${charge.estimatedMonthlyCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Last Charge</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">{formatDate(charge.lastChargeDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Occurrences</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">{charge.transactionCount}</span>
          </div>
        </div>

        {!charge.isActive && (
          <div className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            Possibly cancelled (no recent charges)
          </div>
        )}
      </CardContent>
    </Card>
  )
}
