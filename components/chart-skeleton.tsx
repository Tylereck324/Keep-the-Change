import clsx from 'clsx'

export function ChartSkeleton({ height, className }: { height: number; className?: string }) {
  return (
    <div
      data-testid="chart-skeleton"
      className={clsx('rounded-lg border bg-muted/30 animate-pulse', className)}
      style={{ height: `${height}px` }}
      aria-busy="true"
    />
  )
}
