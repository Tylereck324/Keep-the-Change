import { beforeEach, describe, expect, it, vi } from 'vitest'

const dynamicCalls: Array<{ ssr?: boolean; loading?: () => { props?: { height?: number } } }> = []

vi.mock('next/dynamic', () => ({
  default: (_importer: unknown, options: { ssr?: boolean; loading?: () => { props?: { height?: number } } }) => {
    dynamicCalls.push(options ?? {})
    return () => null
  },
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/actions/reports', () => ({
  getMonthlyReport: vi.fn(),
  getMultiMonthTrend: vi.fn(),
  getForecast: vi.fn(),
  getYearSummary: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

describe('reports page dynamic charts', () => {
  beforeEach(() => {
    dynamicCalls.length = 0
    vi.resetModules()
  })

  it('uses dynamic imports for charts with ssr disabled and skeleton heights', async () => {
    await import('@/app/reports/page')

    expect(dynamicCalls.length).toBe(3)
    for (const call of dynamicCalls) {
      expect(call.ssr).toBe(false)
      const element = call.loading?.()
      expect(element?.props?.height).toBe(300)
    }
  })
})
