'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getHouseholdTimezone, setHouseholdTimezone } from '@/lib/actions/settings'

const LOAD_ERROR_MESSAGE = 'Failed to load timezone. Please try again.'

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

function resolveBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

interface TimezoneSelectorProps {
  detectedTimezone?: string
}

export function TimezoneSelector({ detectedTimezone }: TimezoneSelectorProps) {
  const [selectedTimezone, setSelectedTimezone] = useState('UTC')
  const [savedTimezone, setSavedTimezone] = useState('UTC')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState('UTC')

  const timezoneOptions = useMemo(() => {
    const options = [...TIMEZONE_OPTIONS]
    const values = new Set(options.map((option) => option.value))

    if (detected && !values.has(detected)) {
      options.unshift({ value: detected, label: `${detected} (Detected)` })
      values.add(detected)
    }

    if (selectedTimezone && !values.has(selectedTimezone)) {
      options.unshift({ value: selectedTimezone, label: selectedTimezone })
    }

    return options
  }, [detected, selectedTimezone])

  const loadTimezone = useCallback(async () => {
    setLoading(true)
    setError(null)

    const resolvedDetected = detectedTimezone || resolveBrowserTimezone()
    setDetected(resolvedDetected || 'UTC')

    try {
      const storedTimezone = await getHouseholdTimezone()
      setSavedTimezone(storedTimezone)

      if (storedTimezone === 'UTC' && resolvedDetected && resolvedDetected !== 'UTC') {
        setSelectedTimezone(resolvedDetected)
      } else {
        setSelectedTimezone(storedTimezone)
      }
    } catch {
      setError(LOAD_ERROR_MESSAGE)
      toast.error(LOAD_ERROR_MESSAGE)
    } finally {
      setLoading(false)
    }
  }, [detectedTimezone])

  useEffect(() => {
    void loadTimezone()
  }, [loadTimezone])

  const handleSave = async () => {
    setError(null)

    try {
      await setHouseholdTimezone(selectedTimezone)
      setSavedTimezone(selectedTimezone)
      toast.success('Timezone updated')
    } catch {
      toast.error('Failed to update timezone. Please try again.')
    }
  }

  const hasChanges = selectedTimezone !== savedTimezone

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <Label htmlFor="timezone">Timezone</Label>
        <p className="text-sm text-muted-foreground">
          Used to determine month boundaries for budgets and reports.
        </p>
        {detected && (
          <p className="text-xs text-muted-foreground">
            Detected: {detected}
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
          <SelectTrigger id="timezone" className="md:max-w-xs">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {timezoneOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          Save
        </Button>

        {error ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadTimezone}
          >
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  )
}
