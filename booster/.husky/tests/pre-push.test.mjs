import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('zx', () => ({
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
    warn: vi.fn(),
  },
  runHook: vi.fn(), // Prevent automatic execution
  exec: vi.fn(),
  generateApiDocs: vi.fn(),
  generateDeptracImage: vi.fn(),
}))

// Import dependencies for mocking return values
import { fs } from 'zx'
import { exec, generateApiDocs, isSkipped, generateDeptracImage } from '../shared/index.ts'

// Import functions to test
import { runTests, handleArtifacts } from '../pre-push.ts'

describe('Pre-push Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  describe('handleArtifacts', () => {
    it('should generate both deptrac image and api docs', async () => {
      isSkipped.mockReturnValue(false)
      generateDeptracImage.mockResolvedValue({ generated: true, changed: true })
      generateApiDocs.mockResolvedValue({ generated: true, changed: false })

      await handleArtifacts()

      expect(generateDeptracImage).toHaveBeenCalled()
      expect(generateApiDocs).toHaveBeenCalled()
    })

    it('should skip deptrac if env var is set', async () => {
      isSkipped.mockImplementation((name) => name === 'deptrac_image')
      generateApiDocs.mockResolvedValue({ generated: true, changed: false })

      await handleArtifacts()

      expect(generateDeptracImage).not.toHaveBeenCalled()
      expect(generateApiDocs).toHaveBeenCalled()
    })

    it('should skip api docs if env var is set', async () => {
      isSkipped.mockImplementation((name) => name === 'api_docs')
      generateDeptracImage.mockResolvedValue({ generated: true, changed: false })

      await handleArtifacts()

      expect(generateDeptracImage).toHaveBeenCalled()
      expect(generateApiDocs).not.toHaveBeenCalled()
    })

    it('should not throw if api docs generation fails', async () => {
      isSkipped.mockReturnValue(false)
      generateDeptracImage.mockResolvedValue({ generated: true, changed: false })
      generateApiDocs.mockRejectedValue(new Error('Failed'))

      // Should not throw
      await expect(handleArtifacts()).resolves.not.toThrow()
    })
  })
})
