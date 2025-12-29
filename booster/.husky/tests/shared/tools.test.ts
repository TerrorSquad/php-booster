import { describe, it, expect } from 'vitest'
import { TOOLS } from '../../shared/tools'

describe('tools.ts', () => {
  it('should export valid tool configurations', () => {
    expect(Array.isArray(TOOLS)).toBe(true)
    expect(TOOLS.length).toBeGreaterThan(0)

    TOOLS.forEach(tool => {
      expect(tool).toHaveProperty('name')
      expect(tool).toHaveProperty('command')
      expect(tool).toHaveProperty('type')
      expect(['php', 'node', 'system']).toContain(tool.type)
    })
  })
})
