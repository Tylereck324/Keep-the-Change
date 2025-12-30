'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Failed to load reports</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || 'An unexpected error occurred while loading your reports'}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  )
}
