import { describe, it, expect } from 'vitest'
import * as index from '../../shared/index'

describe('index.ts', () => {
  it('should export all shared modules', () => {
    expect(index.log).toBeDefined()
    expect(index.exec).toBeDefined()
    expect(index.getCurrentBranch).toBeDefined()
    expect(index.runHook).toBeDefined()
    expect(index.generateApiDocs).toBeDefined()
  })
})
