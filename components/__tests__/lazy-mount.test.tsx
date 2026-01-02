import { describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LazyMount } from '@/components/lazy-mount'

let observerCallback: ((entries: IntersectionObserverEntry[]) => void) | undefined

class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
    observerCallback = cb
  }
}

describe('LazyMount', () => {
  it('renders fallback until intersecting', () => {
    // @ts-expect-error test mock
    global.IntersectionObserver = MockIntersectionObserver

    render(
      <LazyMount fallback={<div>Loading</div>}>
        <div>Content</div>
      </LazyMount>
    )

    expect(screen.queryByText('Loading')).not.toBeNull()
    expect(screen.queryByText('Content')).toBeNull()

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry])
    })

    expect(screen.queryByText('Content')).not.toBeNull()
  })

  it('renders immediately when IntersectionObserver is unavailable', () => {
    // @ts-expect-error test mock
    delete global.IntersectionObserver

    render(
      <LazyMount fallback={<div>Loading</div>}>
        <div>Content</div>
      </LazyMount>
    )

    expect(screen.queryByText('Content')).not.toBeNull()
  })
})
