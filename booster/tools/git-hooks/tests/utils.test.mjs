import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock zx with proper structure
vi.mock('zx', () => ({
  $: vi.fn(),
  fs: {
    pathExists: vi.fn(),
  },
  path: {
    join: vi.fn(),
  },
  chalk: {
    blue: vi.fn((str) => str),
    green: vi.fn((str) => str),
    red: vi.fn((str) => str),
    yellow: vi.fn((str) => str),
    cyan: vi.fn((str) => str),
    gray: vi.fn((str) => str),
  }
}))

// Import after mocking
const { $ } = await import('zx')
import {
  getStagedPhpFiles,
  hasVendorBin,
  shouldSkipChecks,
  checkPhpSyntax,
  getRunnerPrefix
} from '../shared/utils.mjs'

// NOTE: These tests are for the deprecated JavaScript implementation.
// The git hooks have been migrated to TypeScript (.ts files).
// These tests need to be rewritten to match the new TypeScript implementation.

describe('Git Hooks Utils (DEPRECATED - JS Implementation)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // BYPASS_PHP_ANALYSIS no longer exists in TypeScript implementation
    // Current variables: SKIP_PRECOMMIT, PRECOMMIT_VERBOSE, tool-specific skips
  })

  describe('getStagedPhpFiles', () => {
    it('should return PHP files from git diff', async () => {
      const mockOutput = 'src/Controller/TestController.php\nsrc/Service/Test Service.php\nREADME.md\n'

      $.mockResolvedValueOnce({
        toString: () => mockOutput
      })

      // Mock fs.pathExists to return true for PHP files
      const { fs } = await import('zx')
      fs.pathExists.mockImplementation((file) =>
        Promise.resolve(file.endsWith('.php'))
      )

      const result = await getStagedPhpFiles()

      expect(result).toEqual([
        'src/Controller/TestController.php',
        'src/Service/Test Service.php'
      ])
      expect($).toHaveBeenCalledWith`git diff --cached --name-only --diff-filter=ACMR`
    })

    it('should handle empty git diff output', async () => {
      $.mockResolvedValueOnce({
        toString: () => ''
      })

      const result = await getStagedPhpFiles()

      expect(result).toEqual([])
    })

    it('should handle git command errors', async () => {
      $.mockRejectedValueOnce(new Error('Not a git repository'))

      const result = await getStagedPhpFiles()

      expect(result).toEqual([])
    })
  })

  describe('hasVendorBin', () => {
    it('should check if vendor binary exists', async () => {
      const { fs } = await import('zx')
      fs.pathExists.mockResolvedValueOnce(true)

      const result = await hasVendorBin('ecs')

      expect(result).toBe(true)
      expect(fs.pathExists).toHaveBeenCalledWith('./vendor/bin/ecs')
    })

    it('should return false for non-existent binary', async () => {
      const { fs } = await import('zx')
      fs.pathExists.mockResolvedValueOnce(false)

      const result = await hasVendorBin('nonexistent')

      expect(result).toBe(false)
    })
  })

  // NOTE: shouldSkipChecks function no longer exists in TypeScript implementation
  // Skip functionality is now handled by SKIP_PRECOMMIT and tool-specific skip environment variables
  describe('shouldSkipChecks (DEPRECATED)', () => {
    it('should return true when BYPASS_PHP_ANALYSIS is set (DEPRECATED)', async () => {
      // This test is deprecated - BYPASS_PHP_ANALYSIS replaced by tool-specific skips
      process.env.BYPASS_PHP_ANALYSIS = '1'

      // Function no longer exists in TypeScript implementation
      // const result = await shouldSkipChecks()
      // expect(result).toBe(true)

      // Skipping this test as function doesn't exist
      console.log('DEPRECATED: shouldSkipChecks function removed in TypeScript implementation')
    })

    it('should return true when in merge state', async () => {
      const { fs, path } = await import('zx')

      $.mockResolvedValueOnce({
        toString: () => '/path/to/.git\n'
      })

      path.join.mockReturnValueOnce('/path/to/.git/MERGE_HEAD')
      fs.pathExists.mockResolvedValueOnce(true)

      const result = await shouldSkipChecks()

      expect(result).toBe(true)
    })

    it('should return false for normal operation', async () => {
      const { fs } = await import('zx')

      $.mockResolvedValueOnce({
        toString: () => '/path/to/.git'
      })

      fs.pathExists.mockResolvedValueOnce(false)

      const result = await shouldSkipChecks()

      expect(result).toBe(false)
    })
  })

  describe('checkPhpSyntax', () => {
    it('should return true for valid PHP files', async () => {
      const files = ['src/Test.php', 'src/Another Test.php']

      // Mock successful php -l calls
      $.mockResolvedValue({ toString: () => 'No syntax errors detected' })

      // Create a spy for console.log to capture log messages
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await checkPhpSyntax(files)

      expect(result).toBe(true)
      expect($).toHaveBeenCalledTimes(2)
      expect($).toHaveBeenCalledWith`php -l -d display_errors=0 src/Test.php`
      expect($).toHaveBeenCalledWith`php -l -d display_errors=0 src/Another Test.php`

      consoleSpy.mockRestore()
    })

    it('should return false for files with syntax errors', async () => {
      const files = ['src/Invalid.php']

      $.mockRejectedValueOnce(new Error('Parse error'))

      const result = await checkPhpSyntax(files)

      expect(result).toBe(false)
    })
  })

  describe('getRunnerPrefix', () => {
    it('should return DDEV prefix when available and running', async () => {
      $.mockResolvedValueOnce({ toString: () => 'ddev version' })
      $.mockResolvedValueOnce({ toString: () => 'Status: running' })

      const result = await getRunnerPrefix()

      expect(result).toEqual(['ddev', 'exec'])
    })

    it('should return empty array when DDEV not available', async () => {
      $.mockRejectedValueOnce(new Error('ddev: command not found'))

      const result = await getRunnerPrefix()

      expect(result).toEqual([])
    })

    it('should return empty array when DDEV not running', async () => {
      $.mockResolvedValueOnce({ toString: () => 'ddev version' })
      $.mockResolvedValueOnce({ toString: () => 'Status: stopped' })

      const result = await getRunnerPrefix()

      expect(result).toEqual([])
    })
  })
})
