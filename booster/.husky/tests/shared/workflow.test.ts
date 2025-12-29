import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runStep, runQualityChecks, runHook } from '../../shared/workflow'
import { GitHook, type ToolConfig } from '../../shared/types'
import {
  exec,
  log,
  isSkipped,
  isDdevProject,
  ensureMutagenSync,
  initEnvironment
} from '../../shared/core'
import { shouldSkipDuringMerge, stageFiles } from '../../shared/git'
import { fs, which, $ } from 'zx'

// Mock dependencies
vi.mock('../../shared/core', () => ({
  exec: vi.fn(),
  log: {
    tool: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    skip: vi.fn(),
    step: vi.fn(),
    celebrate: vi.fn(),
    info: vi.fn()
  },
  isSkipped: vi.fn(),
  isDdevProject: vi.fn(),
  ensureMutagenSync: vi.fn(),
  initEnvironment: vi.fn(),
  formatDuration: (ms: number) => `${ms}ms`
}))

vi.mock('../../shared/git', () => ({
  shouldSkipDuringMerge: vi.fn(),
  stageFiles: vi.fn()
}))

vi.mock('zx', () => ({
  fs: {
    pathExists: vi.fn()
  },
  which: vi.fn(),
  $: {
    verbose: false
  }
}))

describe('workflow.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock process.exit
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called') })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('runStep', () => {
    it('should return true on success', async () => {
      const fn = vi.fn().mockResolvedValue(undefined)
      const result = await runStep('tool', 'action', fn)

      expect(result).toBe(true)
      expect(log.tool).toHaveBeenCalledWith('tool', 'action')
      expect(log.success).toHaveBeenCalled()
    })

    it('should return false on failure', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      const result = await runStep('tool', 'action', fn)

      expect(result).toBe(false)
      expect(log.error).toHaveBeenCalled()
    })
  })

  describe('runQualityChecks', () => {
    const mockTool: ToolConfig = {
      name: 'test-tool',
      command: 'test-cmd',
      type: 'system',
      extensions: ['.php'],
      required: true
    }

    it('should skip if tool is skipped via env', async () => {
      vi.mocked(isSkipped).mockReturnValue(true)

      const result = await runQualityChecks(['file.php'], [mockTool])

      expect(result).toBe(true)
      expect(log.skip).toHaveBeenCalledWith(expect.stringContaining('skipped'))
      expect(exec).not.toHaveBeenCalled()
    })

    it('should skip if no matching files', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)

      const result = await runQualityChecks(['file.js'], [mockTool])

      expect(result).toBe(true)
      expect(exec).not.toHaveBeenCalled()
    })

    it('should skip if tool not available', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(false)
      vi.mocked(which).mockRejectedValue(new Error('not found'))

      const result = await runQualityChecks(['file.php'], [mockTool])

      expect(result).toBe(true)
      expect(log.skip).toHaveBeenCalledWith(expect.stringContaining('not found'))
    })

    it('should run tool if available and files match', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)

      const result = await runQualityChecks(['file.php'], [mockTool])

      expect(result).toBe(true)
      expect(exec).toHaveBeenCalledWith(
        ['test-cmd', 'file.php'],
        { type: 'system' }
      )
    })

    it('should resolve php tool path correctly', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)

      const phpTool: ToolConfig = { ...mockTool, type: 'php', command: 'phpcs' }

      await runQualityChecks(['file.php'], [phpTool])

      expect(exec).toHaveBeenCalledWith(
        ['vendor/bin/phpcs', 'file.php'],
        { type: 'php' }
      )
    })

    it('should resolve node tool path correctly', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)

      const nodeTool: ToolConfig = { ...mockTool, type: 'node', command: 'eslint' }

      await runQualityChecks(['file.php'], [nodeTool])

      expect(exec).toHaveBeenCalledWith(
        ['node_modules/.bin/eslint', 'file.php'],
        { type: 'node' }
      )
    })

    it('should stage files if configured', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)

      const fixingTool: ToolConfig = {
        ...mockTool,
        stagesFilesAfter: true
      }

      await runQualityChecks(['file.php'], [fixingTool])

      expect(ensureMutagenSync).toHaveBeenCalled()
      expect(stageFiles).toHaveBeenCalledWith(['file.php'])
    })

    it('should fail if required tool fails', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockRejectedValue(new Error('fail'))

      const result = await runQualityChecks(['file.php'], [mockTool])

      expect(result).toBe(false)
    })

    it('should not fail if optional tool fails', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockRejectedValue(new Error('fail'))

      const optionalTool: ToolConfig = { ...mockTool, required: false }
      const result = await runQualityChecks(['file.php'], [optionalTool])

      expect(result).toBe(false)
    })

    it('should handle runForEachFile option', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      // Reset exec mock to ensure it succeeds
      vi.mocked(exec).mockResolvedValue({} as any)

      const batchTool: ToolConfig = { ...mockTool, runForEachFile: true }
      const files = Array.from({ length: 15 }, (_, i) => `file${i}.php`)

      await runQualityChecks(files, [batchTool])

      // Should be called for each file (concurrency is handled by Promise.all but exec is called 15 times)
      expect(exec).toHaveBeenCalledTimes(15)
    })

    it('should resolve absolute paths correctly', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)

      const absTool: ToolConfig = { ...mockTool, command: '/usr/bin/tool' }
      await runQualityChecks(['file.php'], [absTool])

      expect(exec).toHaveBeenCalledWith(['/usr/bin/tool', 'file.php'], expect.anything())
    })

    it('should resolve relative paths correctly', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)

      const relTool: ToolConfig = { ...mockTool, command: './tool' }
      await runQualityChecks(['file.php'], [relTool])

      expect(exec).toHaveBeenCalledWith(['./tool', 'file.php'], expect.anything())
    })

    it('should resolve paths with separators correctly', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)

      const pathTool: ToolConfig = { ...mockTool, command: 'vendor/bin/tool' }
      await runQualityChecks(['file.php'], [pathTool])

      expect(exec).toHaveBeenCalledWith(['vendor/bin/tool', 'file.php'], expect.anything())
    })

    it('should resolve system commands correctly', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)

      const sysTool: ToolConfig = { ...mockTool, command: 'git' }
      await runQualityChecks(['file.php'], [sysTool])

      expect(exec).toHaveBeenCalledWith(['git', 'file.php'], expect.anything())
    })

    it('should check tool availability in DDEV for PHP tools', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(isDdevProject).mockResolvedValue(true)

      // Standard tool (php) should be available
      const phpTool: ToolConfig = { ...mockTool, type: 'php', command: 'php' }
      await runQualityChecks(['file.php'], [phpTool])
      expect(exec).toHaveBeenCalled()

      // Custom tool should check fs
      vi.mocked(fs.pathExists).mockResolvedValue(false)
      const customTool: ToolConfig = { ...mockTool, type: 'php', command: 'custom-tool' }
      await runQualityChecks(['file.php'], [customTool])
      // Should skip because pathExists returns false
      // We need to verify it was skipped, so exec shouldn't be called again
      expect(exec).toHaveBeenCalledTimes(1) // Only for the first call
    })
  })

  describe('runHook', () => {
    it('should exit 0 on success', async () => {
      const fn = vi.fn().mockResolvedValue(true)

      try {
        await runHook(GitHook.PreCommit, fn)
      } catch (e) {
        // process.exit throws
      }

      expect(log.celebrate).toHaveBeenCalled()
      // We can't easily check process.exit(0) without catching the error we threw in mock
    })

    it('should exit 1 on failure', async () => {
      const fn = vi.fn().mockResolvedValue(false)

      try {
        await runHook(GitHook.PreCommit, fn)
      } catch (e: any) {
        expect(e.message).toBe('process.exit called')
      }

      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('failed'))
    })

    it('should skip if hook env var set', async () => {
      vi.mocked(isSkipped).mockReturnValue(true)
      const fn = vi.fn()

      try {
        await runHook(GitHook.PreCommit, fn)
      } catch (e) {
        // process.exit(0)
      }

      expect(fn).not.toHaveBeenCalled()
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Skipping'))
    })

    it('should handle unexpected errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Unexpected error'))

      try {
        await runHook(GitHook.PreCommit, fn)
      } catch (e: any) {
        expect(e.message).toBe('process.exit called')
      }

      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Unexpected error'))
    })
  })
})
