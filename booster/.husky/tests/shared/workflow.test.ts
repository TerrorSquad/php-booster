import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runStep, runQualityChecks, runHook } from '../../shared/workflow'
import { GitHook, type ToolConfig } from '../../shared/types'
import {
  exec,
  log,
  isSkipped,
  getSkipEnvVar,
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
    info: vi.fn(),
    warn: vi.fn()
  },
  isSkipped: vi.fn(),
  getSkipEnvVar: vi.fn((name: string) => {
    const normalized = String(name)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    return `SKIP_${normalized}`
  }),
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

    it('should extract PHP parse errors with file and line', async () => {
      const phpError = {
        stderr: 'PHP Parse error:  syntax error, unexpected token "{" in /app/src/Test.php on line 42',
        stdout: '',
        message: 'Command failed'
      }
      const fn = vi.fn().mockRejectedValue(phpError)
      await runStep('PHP Syntax Check', 'Checking syntax...', fn)

      // Should log the extracted error with file and line
      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Test.php'))
      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('line 42'))
    })

    it('should extract file:line:col format errors', async () => {
      const eslintError = {
        stderr: '',
        stdout: 'src/index.ts:15:10: Unexpected token',
        message: 'Command failed'
      }
      const fn = vi.fn().mockRejectedValue(eslintError)
      await runStep('ESLint', 'Linting...', fn)

      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('src/index.ts:15:10'))
    })
  })

  describe('runQualityChecks', () => {
    const mockTool: ToolConfig = {
      name: 'test-tool',
      command: 'test-cmd',
      type: 'system',
      extensions: ['.php']
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

    it('should fail if tool fails', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockRejectedValue(new Error('fail'))

      const result = await runQualityChecks(['file.php'], [mockTool])

      expect(result).toBe(false)
    })

    it('should continue to next tool if tool with default onFailure fails', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockRejectedValueOnce(new Error('first tool failed'))
        .mockResolvedValueOnce({} as any)

      const firstTool: ToolConfig = { ...mockTool }
      const secondTool: ToolConfig = { ...mockTool, name: 'second-tool' }

      const result = await runQualityChecks(['file.php'], [firstTool, secondTool])

      expect(result).toBe(false)
      expect(exec).toHaveBeenCalledTimes(2) // Both tools ran
    })

    it('should stop subsequent tools if onFailure is stop', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockRejectedValue(new Error('syntax error'))

      const stoppingTool: ToolConfig = { ...mockTool, onFailure: 'stop' }
      const subsequentTool: ToolConfig = { ...mockTool, name: 'subsequent-tool' }

      const result = await runQualityChecks(['file.php'], [stoppingTool, subsequentTool])

      expect(result).toBe(false)
      expect(exec).toHaveBeenCalledTimes(1) // Only stopping tool ran
      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Stopping subsequent checks'))
    })

    it('should continue to next tool if onFailure is continue', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockRejectedValueOnce(new Error('first tool failed'))
        .mockResolvedValueOnce({} as any)

      const firstTool: ToolConfig = { ...mockTool, onFailure: 'continue' }
      const secondTool: ToolConfig = { ...mockTool, name: 'second-tool' }

      const result = await runQualityChecks(['file.php'], [firstTool, secondTool])

      expect(result).toBe(false)
      expect(exec).toHaveBeenCalledTimes(2) // Both tools ran
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

    it('should skip tools not in HOOKS_ONLY groups', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockResolvedValue({} as any)

      // Set HOOKS_ONLY to only run lint tools
      process.env.HOOKS_ONLY = 'lint'

      const lintTool: ToolConfig = { ...mockTool, name: 'lint-tool', group: 'lint' }
      const formatTool: ToolConfig = { ...mockTool, name: 'format-tool', group: 'format' }

      await runQualityChecks(['file.php'], [lintTool, formatTool])

      // Only lint tool should run
      expect(exec).toHaveBeenCalledTimes(1)
      expect(log.skip).toHaveBeenCalledWith(expect.stringContaining('format-tool'))
      expect(log.skip).toHaveBeenCalledWith(expect.stringContaining('HOOKS_ONLY'))

      delete process.env.HOOKS_ONLY
    })

    it('should run tools in multiple HOOKS_ONLY groups', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockResolvedValue({} as any)

      process.env.HOOKS_ONLY = 'lint,format'

      const lintTool: ToolConfig = { ...mockTool, name: 'lint-tool', group: 'lint' }
      const formatTool: ToolConfig = { ...mockTool, name: 'format-tool', group: 'format' }
      const analysisTool: ToolConfig = { ...mockTool, name: 'analysis-tool', group: 'analysis' }

      await runQualityChecks(['file.php'], [lintTool, formatTool, analysisTool])

      // Lint and format tools should run, analysis should be skipped
      expect(exec).toHaveBeenCalledTimes(2)
      expect(log.skip).toHaveBeenCalledWith(expect.stringContaining('analysis-tool'))

      delete process.env.HOOKS_ONLY
    })

    it('should run tools without group when HOOKS_ONLY is set', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockResolvedValue({} as any)

      process.env.HOOKS_ONLY = 'lint'

      const lintTool: ToolConfig = { ...mockTool, name: 'lint-tool', group: 'lint' }
      const noGroupTool: ToolConfig = { ...mockTool, name: 'no-group-tool' } // no group

      await runQualityChecks(['file.php'], [lintTool, noGroupTool])

      // Both should run - tools without group are not filtered
      expect(exec).toHaveBeenCalledTimes(2)

      delete process.env.HOOKS_ONLY
    })

    it('should run all tools when HOOKS_ONLY is not set', async () => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockResolvedValue({} as any)

      delete process.env.HOOKS_ONLY

      const lintTool: ToolConfig = { ...mockTool, name: 'lint-tool', group: 'lint' }
      const formatTool: ToolConfig = { ...mockTool, name: 'format-tool', group: 'format' }

      await runQualityChecks(['file.php'], [lintTool, formatTool])

      expect(exec).toHaveBeenCalledTimes(2)
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

  describe('parallel execution', () => {
    const mockTool: ToolConfig = {
      name: 'test-tool',
      command: 'test-cmd',
      type: 'system',
      extensions: ['.php']
    }

    beforeEach(() => {
      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockResolvedValue({} as any)
    })

    it('should run single tool in streaming mode', async () => {
      const tool: ToolConfig = { ...mockTool }

      await runQualityChecks(['file.php'], [tool])

      // Single tool uses exec (streaming), not buffered
      expect(exec).toHaveBeenCalledTimes(1)
      expect(log.tool).toHaveBeenCalled()
    })



    it('should skip tool when HOOKS_ONLY excludes its group', async () => {
      const originalEnv = process.env.HOOKS_ONLY
      process.env.HOOKS_ONLY = 'lint,format'

      const analysisTool: ToolConfig = { ...mockTool, name: 'phpstan', group: 'analysis' }
      const lintTool: ToolConfig = { ...mockTool, name: 'eslint', command: 'eslint', group: 'lint' }

      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockReset()

      await runQualityChecks(['file.php'], [analysisTool, lintTool])

      // analysisTool should be skipped, lintTool should run
      expect(log.skip).toHaveBeenCalledWith(expect.stringContaining('not in HOOKS_ONLY'))
      expect(exec).toHaveBeenCalledTimes(1)
      expect(exec).toHaveBeenCalledWith(['eslint', 'file.php'], expect.any(Object))

      process.env.HOOKS_ONLY = originalEnv
    })

    it('should run all tools when HOOKS_ONLY is not set', async () => {
      const originalEnv = process.env.HOOKS_ONLY
      delete process.env.HOOKS_ONLY

      const tool1: ToolConfig = { ...mockTool, name: 'tool-1', group: 'analysis' }
      const tool2: ToolConfig = { ...mockTool, name: 'tool-2', group: 'lint' }

      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockReset()

      await runQualityChecks(['file.php'], [tool1, tool2])

      expect(exec).toHaveBeenCalledTimes(2)

      process.env.HOOKS_ONLY = originalEnv
    })

    it('should parse HOOKS_ONLY with spaces and mixed case', async () => {
      const originalEnv = process.env.HOOKS_ONLY
      process.env.HOOKS_ONLY = ' Lint , FORMAT '

      const lintTool: ToolConfig = { ...mockTool, name: 'eslint', group: 'lint' }
      const formatTool: ToolConfig = { ...mockTool, name: 'prettier', group: 'format' }
      const analysisTool: ToolConfig = { ...mockTool, name: 'phpstan', group: 'analysis' }

      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockReset()

      await runQualityChecks(['file.php'], [lintTool, formatTool, analysisTool])

      // lint and format should run, analysis should be skipped
      expect(exec).toHaveBeenCalledTimes(2)
      expect(log.skip).toHaveBeenCalledWith(expect.stringContaining('phpstan'))

      process.env.HOOKS_ONLY = originalEnv
    })

    it('should run tool without group when HOOKS_ONLY is set', async () => {
      const originalEnv = process.env.HOOKS_ONLY
      process.env.HOOKS_ONLY = 'lint'

      const toolWithGroup: ToolConfig = { ...mockTool, name: 'with-group', group: 'analysis' }
      const toolWithoutGroup: ToolConfig = { ...mockTool, name: 'no-group', command: 'no-group' }

      vi.mocked(isSkipped).mockReturnValue(false)
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockReset()

      await runQualityChecks(['file.php'], [toolWithGroup, toolWithoutGroup])

      // Tool without group should still run (not filtered)
      expect(exec).toHaveBeenCalledTimes(1)
      expect(exec).toHaveBeenCalledWith(['no-group', 'file.php'], expect.any(Object))

      process.env.HOOKS_ONLY = originalEnv
    })
  })

  describe('extractErrorDetails', () => {
    it('should truncate very long error output', async () => {
      const longError = {
        stderr: 'A'.repeat(500), // Very long error
        stdout: '',
        message: 'Command failed'
      }
      const fn = vi.fn().mockRejectedValue(longError)
      await runStep('Test Tool', 'Testing...', fn)

      // Error should be logged but truncated to first line or generic message
      expect(log.error).toHaveBeenCalled()
      const errorCall = vi.mocked(log.error).mock.calls.find(
        call => call[0].includes('→')
      )
      expect(errorCall).toBeDefined()
      // Should not contain the full 500 char string
      expect(errorCall![0].length).toBeLessThan(300)
    })

    it('should extract first non-empty line for generic errors', async () => {
      const multilineError = {
        stderr: '\n\n  First real error\nSecond line\nThird line',
        stdout: '',
        message: 'Command failed'
      }
      const fn = vi.fn().mockRejectedValue(multilineError)
      await runStep('Test Tool', 'Testing...', fn)

      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('First real error'))
    })
  })
})
