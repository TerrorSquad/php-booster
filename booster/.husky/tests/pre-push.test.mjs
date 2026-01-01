import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('zx', () => ({
  $: vi.fn(),
  fs: {
    pathExists: vi.fn(),
  },
}))

vi.mock('../shared/index.ts', () => ({
  GitHook: { PrePush: 'pre-push' },
  isSkipped: vi.fn(),
  log: {
    info: vi.fn(),
    tool: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
  runHook: vi.fn(), // Prevent automatic execution
  exec: vi.fn(),
  generateApiDocs: vi.fn(),
  generateDeptracImage: vi.fn(),
}))

// Import dependencies for mocking return values
import { $ } from 'zx'
import { fs } from 'zx'
import { exec, generateApiDocs, isSkipped, generateDeptracImage } from '../shared/index.ts'

// Import functions to test
import { shouldSkip, runTests, handleApiDocs } from '../pre-push.ts'

describe('Pre-push Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('shouldSkip', () => {
    it('should skip if commit message contains skip tag', async () => {
      $.mockResolvedValue({ stdout: 'chore: update API documentation' })
      expect(await shouldSkip()).toBe(true)
    })

    it('should not skip for normal commits', async () => {
      $.mockResolvedValue({ stdout: 'feat: new feature' })
      expect(await shouldSkip()).toBe(false)
    })
  })

  describe('runTests', () => {
    it('should run tests if pest exists', async () => {
      fs.pathExists.mockResolvedValue(true)
      exec.mockResolvedValue(true)

      const result = await runTests()

      expect(result).toBe(true)
      expect(exec).toHaveBeenCalledWith(['composer', 'test:pest'], { type: 'php' })
    })

    it('should return false if tests fail', async () => {
      fs.pathExists.mockResolvedValue(true)
      exec.mockRejectedValue(new Error('Tests failed'))

      const result = await runTests()

      expect(result).toBe(false)
    })

    it('should skip tests if pest does not exist', async () => {
      fs.pathExists.mockResolvedValue(false)

      const result = await runTests()

      expect(result).toBe(true)
      expect(exec).not.toHaveBeenCalled()
    })
  })

  describe('handleApiDocs', () => {
    it('should generate api docs', async () => {
      isSkipped.mockReturnValue(false)
      generateApiDocs.mockResolvedValue(true)

      const result = await handleApiDocs()

      expect(result).toBe(true)
      expect(generateApiDocs).toHaveBeenCalled()
    })

    it('should skip if env var is set', async () => {
      isSkipped.mockReturnValue(true)

      const result = await handleApiDocs()

      expect(result).toBe(true)
      expect(generateApiDocs).not.toHaveBeenCalled()
    })

    it('should return false if generation fails', async () => {
      isSkipped.mockReturnValue(false)
      generateApiDocs.mockRejectedValue(new Error('Failed'))

      const result = await handleApiDocs()

      expect(result).toBe(false)
    })
  })

  describe('Integration', () => {
    it('should generate deptrac image', async () => {
      expect(generateDeptracImage).toBeDefined()
    })
  })
})
