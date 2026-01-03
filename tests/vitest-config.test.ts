/* @vitest-environment node */
import { describe, it, expect } from 'vitest'
import config from '../vitest.config.mts'

describe('vitest config', () => {
  it('excludes .worktrees from test discovery', () => {
    const exclude = config.test?.exclude ?? []
    expect(exclude).toContain('**/.worktrees/**')
  })
})
