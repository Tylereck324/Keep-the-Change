'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getAutoRolloverSetting, setAutoRolloverSetting } from '@/lib/actions/settings'

export function AutoRolloverToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAutoRolloverSetting().then((value) => {
      setEnabled(value)
      setLoading(false)
    })
  }, [])

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked)
    try {
      await setAutoRolloverSetting(checked)
    } catch {
      // Revert on error and notify user
      setEnabled(!checked)
      toast.error('Failed to update setting. Please try again.')
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="auto-rollover">Auto-Rollover Budget</Label>
        <p className="text-sm text-muted-foreground">
          Automatically copy budget amounts to next month
        </p>
      </div>
      <Switch
        id="auto-rollover"
        checked={enabled}
        onCheckedChange={handleToggle}
      />
    </div>
  )
}
