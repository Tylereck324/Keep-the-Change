'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { setBudgetAmount } from '@/lib/actions/budgets'

interface BudgetAmountInputProps {
  categoryId: string
  month: string
  initialAmount: number
}

export function BudgetAmountInput({ categoryId, month, initialAmount }: BudgetAmountInputProps) {
  const [amount, setAmount] = useState(initialAmount.toString())
  const [saving, setSaving] = useState(false)

  const handleBlur = async () => {
    const numAmount = parseFloat(amount) || 0
    if (numAmount === initialAmount) return

    setSaving(true)
    try {
      await setBudgetAmount(categoryId, month, numAmount)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
      setAmount(initialAmount.toString())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">$</span>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={handleBlur}
        className="w-24 h-8"
        disabled={saving}
      />
    </div>
  )
}
