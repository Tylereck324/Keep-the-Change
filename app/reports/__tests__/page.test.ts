import { beforeEach, describe, expect, it, vi } from 'vitest'

const dynamicCalls: Array<{ ssr?: boolean; loading?: () => { props?: { height?: number } } }> = []

vi.mock('next/dynamic', () => ({
  default: (_importer: unknown, options: { ssr?: boolean; loading?: () => { props?: { height?: number } } }) => {
    dynamicCalls.push(options ?? {})
    return () => null
  },
}))

describe('report charts dynamic imports', () => {
  beforeEach(() => {
    dynamicCalls.length = 0
    vi.resetModules()
  })

  it('uses dynamic imports for charts with ssr disabled and skeleton heights', async () => {
    await import('@/components/reports/report-charts')

    expect(dynamicCalls.length).toBe(3)
    for (const call of dynamicCalls) {
      expect(call.ssr).toBe(false)
      const element = call.loading?.()
      expect(element?.props?.height).toBe(300)
    }
  })
})
