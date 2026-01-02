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

vi.mock('@/lib/actions/insights', () => ({
  getMerchantInsights: vi.fn(),
  getRecurringCharges: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

describe('insights page dynamic chart', () => {
  beforeEach(() => {
    dynamicCalls.length = 0
    vi.resetModules()
  })

  it('uses dynamic import for merchant chart with ssr disabled and skeleton height', async () => {
    await import('@/app/insights/page')

    expect(dynamicCalls.length).toBe(1)
    const call = dynamicCalls[0]
    expect(call.ssr).toBe(false)
    const element = call.loading?.()
    expect(element?.props?.height).toBe(350)
  })
})
