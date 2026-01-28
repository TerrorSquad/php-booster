import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ToolConfig, HooksConfig, FailureMode } from '../../shared/types'

// Mock zx
vi.mock('zx', () => {
  const $ = vi.fn().mockImplementation(() => {
    return vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
  })
  return {
    $: $,
    chalk: {
      blue: (s: string) => s,
      green: (s: string) => s,
      red: (s: string) => s,
      yellow: (s: string) => s,
      cyan: (s: string) => s,
      gray: (s: string) => s,
      level: 0,
    },
    fs: {
      pathExists: vi.fn().mockResolvedValue(false),
      readFile: vi.fn().mockRejectedValue(new Error('File not found')),
    },
    which: vi.fn(),
  }
})

// Import after mocking
import {
  loadConfig,
  applyConfigOverrides,
  isHookSkippedByConfig,
  applyVerboseSetting,
  resetConfigCache,
} from '../../shared/config'
import { fs } from 'zx'

describe('config.ts', () => {
  const mockPathExists = fs.pathExists as ReturnType<typeof vi.fn>
  const mockReadFile = fs.readFile as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    resetConfigCache()
    delete process.env.GIT_HOOKS_CONFIG
    delete process.env.GIT_HOOKS_VERBOSE
  })

  afterEach(() => {
    resetConfigCache()
    delete process.env.GIT_HOOKS_CONFIG
    delete process.env.GIT_HOOKS_VERBOSE
  })

  describe('loadConfig', () => {
    it('should return empty config when no config file exists', async () => {
      mockPathExists.mockResolvedValue(false)

      const config = await loadConfig()

      expect(config).toEqual({})
    })

    it('should load config from .git-hooks.config.json', async () => {
      mockPathExists.mockImplementation((path: string) =>
        Promise.resolve(path.includes('.git-hooks.config.json')),
      )
      mockReadFile.mockResolvedValue(JSON.stringify({ verbose: true }))

      const config = await loadConfig()

      expect(config.verbose).toBe(true)
    })

    it('should load config from .githooks.json as fallback', async () => {
      mockPathExists.mockImplementation((path: string) =>
        Promise.resolve(path.includes('.githooks.json')),
      )
      mockReadFile.mockResolvedValue(JSON.stringify({ verbose: false }))

      const config = await loadConfig()

      expect(config).toHaveProperty('verbose', false)
    })

    it('should load config from GIT_HOOKS_CONFIG env var', async () => {
      process.env.GIT_HOOKS_CONFIG = '/custom/path/config.json'
      mockPathExists.mockImplementation((path: string) =>
        Promise.resolve(path === '/custom/path/config.json'),
      )
      mockReadFile.mockResolvedValue(JSON.stringify({ verbose: true }))

      const config = await loadConfig()

      expect(config.verbose).toBe(true)
    })

    it('should cache config on subsequent calls', async () => {
      mockPathExists.mockResolvedValue(false)

      await loadConfig()
      await loadConfig()
      await loadConfig()

      // pathExists should only be called once due to caching
      // It checks multiple paths on first call, but subsequent calls use cache
      const firstCallCount = mockPathExists.mock.calls.length
      await loadConfig()
      expect(mockPathExists.mock.calls.length).toBe(firstCallCount)
    })

    it('should return empty config on invalid JSON', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      mockPathExists.mockImplementation((path: string) =>
        Promise.resolve(path.includes('.git-hooks.config.json')),
      )
      mockReadFile.mockResolvedValue('invalid json {{{')

      const config = await loadConfig()

      expect(config).toEqual({})
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('applyConfigOverrides', () => {
    const baseTools: ToolConfig[] = [
      {
        name: 'PHPStan',
        command: 'vendor/bin/phpstan',
        args: ['analyse'],
        type: 'php',
        extensions: ['.php'],
        description: 'Static analysis',
      },
      {
        name: 'ESLint',
        command: 'eslint',
        args: ['--fix'],
        type: 'node',
        extensions: ['.js', '.ts'],
        description: 'JavaScript linting',
      },
    ]

    it('should return tools unchanged with empty config', () => {
      const result = applyConfigOverrides(baseTools, {})

      expect(result).toEqual(baseTools)
    })

    it('should disable a tool when enabled is false', () => {
      const config: HooksConfig = {
        tools: {
          PHPStan: { enabled: false },
        },
      }

      const result = applyConfigOverrides(baseTools, config)

      expect(result.find((t) => t.name === 'PHPStan')).toBeUndefined()
      expect(result.find((t) => t.name === 'ESLint')).toBeDefined()
    })

    it('should override tool arguments', () => {
      const config: HooksConfig = {
        tools: {
          PHPStan: { args: ['analyse', '--level=9'] },
        },
      }

      const result = applyConfigOverrides(baseTools, config)
      const phpstan = result.find((t) => t.name === 'PHPStan')

      expect(phpstan?.args).toEqual(['analyse', '--level=9'])
    })

    it('should override tool extensions', () => {
      const config: HooksConfig = {
        tools: {
          ESLint: { extensions: ['.jsx', '.tsx'] },
        },
      }

      const result = applyConfigOverrides(baseTools, config)
      const eslint = result.find((t) => t.name === 'ESLint')

      expect(eslint?.extensions).toEqual(['.jsx', '.tsx'])
    })

    it('should override failure mode', () => {
      const config: HooksConfig = {
        tools: {
          PHPStan: { onFailure: 'stop' as FailureMode },
        },
      }

      const result = applyConfigOverrides(baseTools, config)
      const phpstan = result.find((t) => t.name === 'PHPStan')

      expect(phpstan?.onFailure).toBe('stop')
    })


    it('should add custom tools', () => {
      const config: HooksConfig = {
        tools: {
          CustomLint: {
            command: 'custom-lint',
            args: ['--strict'],
            type: 'node',
            extensions: ['.custom'],
            description: 'Custom linter',
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config)
      const customTool = result.find((t) => t.name === 'CustomLint')

      expect(customTool).toBeDefined()
      expect(customTool?.command).toBe('custom-lint')
      expect(customTool?.args).toEqual(['--strict'])
    })

    it('should not add custom tools that are disabled', () => {
      const config: HooksConfig = {
        tools: {
          CustomLint: {
            enabled: false,
            command: 'custom-lint',
            type: 'node',
            extensions: ['.custom'],
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config)

      expect(result.find((t) => t.name === 'CustomLint')).toBeUndefined()
    })

    it('should warn about unknown tool without command', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const config: HooksConfig = {
        tools: {
          UnknownTool: { args: ['--test'] },
        },
      }

      const result = applyConfigOverrides(baseTools, config)

      expect(result.find((t) => t.name === 'UnknownTool')).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should apply config override with case-insensitive tool name lookup (lowercase)', () => {
      const config: HooksConfig = {
        tools: {
          phpstan: { enabled: false },  // lowercase instead of 'PHPStan'
        },
      }

      const result = applyConfigOverrides(baseTools, config)

      expect(result.find((t) => t.name === 'PHPStan')).toBeUndefined()
      expect(result.find((t) => t.name === 'ESLint')).toBeDefined()
    })

    it('should apply config override with case-insensitive tool name lookup (mixed case)', () => {
      const config: HooksConfig = {
        tools: {
          Phpstan: { args: ['analyse', '--level=max'] },  // mixed case
        },
      }

      const result = applyConfigOverrides(baseTools, config)
      const phpstan = result.find((t) => t.name === 'PHPStan')

      expect(phpstan?.args).toEqual(['analyse', '--level=max'])
    })

    it('should apply config override with case-insensitive tool name lookup (all caps)', () => {
      const config: HooksConfig = {
        tools: {
          ESLINT: { extensions: ['.vue'] },  // all caps instead of 'ESLint'
        },
      }

      const result = applyConfigOverrides(baseTools, config)
      const eslint = result.find((t) => t.name === 'ESLint')

      expect(eslint?.extensions).toEqual(['.vue'])
    })
  })

  describe('isHookSkippedByConfig', () => {
    it('should return false with empty config', () => {
      expect(isHookSkippedByConfig('preCommit', {})).toBe(false)
      expect(isHookSkippedByConfig('prePush', {})).toBe(false)
      expect(isHookSkippedByConfig('commitMsg', {})).toBe(false)
    })

    it('should return true when hook is disabled', () => {
      const config: HooksConfig = {
        skip: {
          preCommit: true,
        },
      }

      expect(isHookSkippedByConfig('preCommit', config)).toBe(true)
      expect(isHookSkippedByConfig('prePush', config)).toBe(false)
    })

    it('should return false when hook is explicitly enabled', () => {
      const config: HooksConfig = {
        skip: {
          preCommit: false,
        },
      }

      expect(isHookSkippedByConfig('preCommit', config)).toBe(false)
    })

    it('should support tests skip', () => {
      const config: HooksConfig = {
        skip: {
          tests: true,
        },
      }

      expect(isHookSkippedByConfig('tests', config)).toBe(true)
    })

    it('should support artifacts skip', () => {
      const config: HooksConfig = {
        skip: {
          artifacts: true,
        },
      }

      expect(isHookSkippedByConfig('artifacts', config)).toBe(true)
    })
  })

  describe('applyVerboseSetting', () => {
    it('should set GIT_HOOKS_VERBOSE when config.verbose is true', () => {
      delete process.env.GIT_HOOKS_VERBOSE

      applyVerboseSetting({ verbose: true })

      expect(process.env.GIT_HOOKS_VERBOSE).toBe('1')
    })

    it('should not override existing GIT_HOOKS_VERBOSE', () => {
      process.env.GIT_HOOKS_VERBOSE = '0'

      applyVerboseSetting({ verbose: true })

      expect(process.env.GIT_HOOKS_VERBOSE).toBe('0')
    })

    it('should do nothing when config.verbose is false', () => {
      delete process.env.GIT_HOOKS_VERBOSE

      applyVerboseSetting({ verbose: false })

      expect(process.env.GIT_HOOKS_VERBOSE).toBeUndefined()
    })

    it('should do nothing with empty config', () => {
      delete process.env.GIT_HOOKS_VERBOSE

      applyVerboseSetting({})

      expect(process.env.GIT_HOOKS_VERBOSE).toBeUndefined()
    })
  })

  describe('resetConfigCache', () => {
    it('should clear the config cache', async () => {
      mockPathExists.mockResolvedValue(false)

      // Load config to populate cache
      await loadConfig()
      const initialCalls = mockPathExists.mock.calls.length

      // Reset cache and load again
      resetConfigCache()
      await loadConfig()

      // Should have made new calls after reset
      expect(mockPathExists.mock.calls.length).toBeGreaterThan(initialCalls)
    })
  })
})
