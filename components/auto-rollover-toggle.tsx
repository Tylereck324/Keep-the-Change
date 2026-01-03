'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getAutoRolloverSetting, setAutoRolloverSetting } from '@/lib/actions/settings'

const LOAD_ERROR_MESSAGE = 'Failed to load setting. Please try again.'

export function AutoRolloverToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSetting = async () => {
    setLoading(true)
    setError(null)

    try {
      const value = await getAutoRolloverSetting()
      setEnabled(value)
    } catch {
      setError(LOAD_ERROR_MESSAGE)
      toast.error(LOAD_ERROR_MESSAGE)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSetting()
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
      <div className="space-y-2">
        <div className="space-y-0.5">
          <Label htmlFor="auto-rollover">Auto-Rollover Budget</Label>
          <p className="text-sm text-muted-foreground">
            Automatically copy budget amounts to next month
          </p>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        {error && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSetting}
          >
            Retry
          </Button>
        )}
      </div>
      <Switch
        id="auto-rollover"
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading || Boolean(error)}
      />
    </div>
  )
}
