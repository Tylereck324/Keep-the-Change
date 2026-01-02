import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChartSkeleton } from '@/components/chart-skeleton'

describe('ChartSkeleton', () => {
  it('renders a fixed-height placeholder', () => {
    render(<ChartSkeleton height={240} />)
    const el = screen.getByTestId('chart-skeleton')
    expect(el).not.toBeNull()
    expect(el.getAttribute('style') ?? '').toContain('height: 240px')
  })
})
