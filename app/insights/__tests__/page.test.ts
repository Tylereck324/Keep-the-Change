import { beforeEach, describe, expect, it, vi } from 'vitest'

const dynamicCalls: Array<{ ssr?: boolean; loading?: () => { props?: { height?: number } } }> = []

vi.mock('next/dynamic', () => ({
  default: (_importer: unknown, options: { ssr?: boolean; loading?: () => { props?: { height?: number } } }) => {
    dynamicCalls.push(options ?? {})
    return () => null
  },
}))

describe('merchant chart section dynamic import', () => {
  beforeEach(() => {
    dynamicCalls.length = 0
    vi.resetModules()
  })

  it('uses dynamic import for merchant chart with ssr disabled and skeleton height', async () => {
    await import('@/components/insights/merchant-chart-section')

    expect(dynamicCalls.length).toBe(1)
    const call = dynamicCalls[0]
    expect(call.ssr).toBe(false)
    const element = call.loading?.()
    expect(element?.props?.height).toBe(350)
  })
})
