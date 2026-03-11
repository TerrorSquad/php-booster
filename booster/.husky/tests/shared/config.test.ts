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
    it('should return null when no config file exists', async () => {
      mockPathExists.mockResolvedValue(false)

      const config = await loadConfig()

      expect(config).toBeNull()
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

    it('should return empty array with empty config (no tools configured)', () => {
      const result = applyConfigOverrides(baseTools, {})

      expect(result).toEqual([])
    })

    it('should disable a tool when enabled is false', () => {
      const config: HooksConfig = {
        hooks: { preCommit: { tools: { PHPStan: { enabled: false } } } },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')

      // PHPStan is listed but disabled — excluded
      expect(result.find((t) => t.name === 'PHPStan')).toBeUndefined()
      // ESLint was never listed in config — not auto-included
      expect(result).toHaveLength(0)
    })

    it('should override tool arguments', () => {
      const config: HooksConfig = {
        hooks: { preCommit: { tools: { PHPStan: { args: ['analyse', '--level=9'] } } } },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')
      const phpstan = result.find((t) => t.name === 'PHPStan')

      expect(phpstan?.args).toEqual(['analyse', '--level=9'])
    })

    it('should completely override existing tool (command, type, etc.)', () => {
      const config: HooksConfig = {
        hooks: {
          preCommit: {
            tools: {
              PHPStan: {
                command: 'docker-compose',
                args: ['exec', 'php', 'phpstan'],
                type: 'system',
                includePatterns: ['src/**/*.php'],
              } as any,
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')
      const phpstan = result.find((t) => t.name === 'PHPStan')

      expect(phpstan?.command).toBe('docker-compose')
      expect(phpstan?.type).toBe('system')
      expect(phpstan?.args).toEqual(['exec', 'php', 'phpstan'])
      expect(phpstan?.includePatterns).toEqual(['src/**/*.php'])
      // Should preserve existing properties not overridden
      expect(phpstan?.extensions).toEqual(['.php'])
    })

    it('should override tool extensions', () => {
      const config: HooksConfig = {
        hooks: { preCommit: { tools: { ESLint: { extensions: ['.jsx', '.tsx'] } } } },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')
      const eslint = result.find((t) => t.name === 'ESLint')

      expect(eslint?.extensions).toEqual(['.jsx', '.tsx'])
    })

    it('should override failure mode', () => {
      const config: HooksConfig = {
        hooks: { preCommit: { tools: { PHPStan: { onFailure: 'stop' as FailureMode } } } },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')
      const phpstan = result.find((t) => t.name === 'PHPStan')

      expect(phpstan?.onFailure).toBe('stop')
    })

    it('should add custom tools', () => {
      const config: HooksConfig = {
        hooks: {
          preCommit: {
            tools: {
              CustomLint: {
                command: 'custom-lint',
                args: ['--strict'],
                type: 'node',
                extensions: ['.custom'],
                description: 'Custom linter',
              },
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')
      const customTool = result.find((t) => t.name === 'CustomLint')

      expect(customTool).toBeDefined()
      expect(customTool?.command).toBe('custom-lint')
      expect(customTool?.args).toEqual(['--strict'])
    })

    it('should not add custom tools that are disabled', () => {
      const config: HooksConfig = {
        hooks: {
          preCommit: {
            tools: {
              CustomLint: {
                enabled: false,
                command: 'custom-lint',
                type: 'node',
                extensions: ['.custom'],
              },
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')

      expect(result.find((t) => t.name === 'CustomLint')).toBeUndefined()
    })

    it('should warn about unknown tool without command', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const config: HooksConfig = {
        hooks: { preCommit: { tools: { UnknownTool: { args: ['--test'] } } } },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')

      expect(result.find((t) => t.name === 'UnknownTool')).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should apply config override with case-insensitive tool name lookup (lowercase)', () => {
      const config: HooksConfig = {
        hooks: { preCommit: { tools: { phpstan: { enabled: false } } } }, // lowercase
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')

      // PHPStan matched case-insensitively and disabled → excluded
      expect(result.find((t) => t.name === 'PHPStan')).toBeUndefined()
      // ESLint not listed in config → not auto-included (config-driven)
      expect(result.find((t) => t.name === 'ESLint')).toBeUndefined()
      expect(result).toHaveLength(0)
    })

    it('should apply config override with case-insensitive tool name lookup (mixed case)', () => {
      const config: HooksConfig = {
        hooks: { preCommit: { tools: { Phpstan: { args: ['analyse', '--level=max'] } } } }, // mixed case
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')
      const phpstan = result.find((t) => t.name === 'PHPStan')

      expect(phpstan?.args).toEqual(['analyse', '--level=max'])
    })

    it('should apply config override with case-insensitive tool name lookup (all caps)', () => {
      const config: HooksConfig = {
        hooks: { preCommit: { tools: { ESLINT: { extensions: ['.vue'] } } } }, // all caps
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')
      const eslint = result.find((t) => t.name === 'ESLint')

      expect(eslint?.extensions).toEqual(['.vue'])
    })
  })

  describe('applyConfigOverrides – per-hook tools', () => {
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

    // --- preCommit ---

    it('should return empty array for preCommit when no tools configured', () => {
      const config: HooksConfig = {}

      const result = applyConfigOverrides(baseTools, config, 'preCommit')

      // Config-driven: no tools listed → nothing runs
      expect(result).toHaveLength(0)
    })

    it('should apply hooks.preCommit.tools overrides for preCommit hook', () => {
      const config: HooksConfig = {
        hooks: {
          preCommit: {
            tools: {
              PHPStan: { args: ['analyse', '--level=9'] },
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')
      const phpstan = result.find((t) => t.name === 'PHPStan')

      expect(phpstan?.args).toEqual(['analyse', '--level=9'])
    })

    it('should include a custom tool listed in hooks.preCommit.tools', () => {
      const config: HooksConfig = {
        hooks: {
          preCommit: {
            tools: {
              NewTool: {
                command: 'new-lint',
                type: 'node',
                extensions: ['.ts'],
              },
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'preCommit')

      // Only the explicitly listed tool is present (config-driven)
      expect(result.find((t) => t.name === 'NewTool')).toBeDefined()
      expect(result).toHaveLength(1)
    })

    // --- prePush ---

    it('should return empty array for prePush when no hook-specific tools configured', () => {
      const config: HooksConfig = {}

      const result = applyConfigOverrides(baseTools, config, 'prePush')

      expect(result).toHaveLength(0)
    })

    it('should return only hook-specific tools for prePush', () => {
      const config: HooksConfig = {
        hooks: {
          prePush: {
            tools: {
              PHPStan: { passFiles: false }, // reference existing tool definition
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'prePush')

      // Only PHPStan should run; ESLint was NOT mentioned
      expect(result).toHaveLength(1)
      const phpstan = result.find((t) => t.name === 'PHPStan')
      expect(phpstan).toBeDefined()
      expect(phpstan?.passFiles).toBe(false)
      // Base properties preserved from defaultTools lookup
      expect(phpstan?.command).toBe('vendor/bin/phpstan')
    })

    it('should add a brand-new custom tool for prePush', () => {
      const config: HooksConfig = {
        hooks: {
          prePush: {
            tools: {
              MyAnalyser: {
                command: 'vendor/bin/my-analyser',
                type: 'php',
                extensions: ['.php'],
                passFiles: false,
              },
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'prePush')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('MyAnalyser')
      expect(result[0].command).toBe('vendor/bin/my-analyser')
    })

    it('should not include disabled tools in prePush hook-specific list', () => {
      const config: HooksConfig = {
        hooks: {
          prePush: {
            tools: {
              PHPStan: { enabled: false },
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'prePush')

      expect(result.find((t) => t.name === 'PHPStan')).toBeUndefined()
    })

    it('should only include tools explicitly listed for prePush', () => {
      const config: HooksConfig = {
        hooks: {
          prePush: {
            tools: {
              PHPStan: { passFiles: false },
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'prePush')

      // ESLint was not listed — should not appear
      expect(result.find((t) => t.name === 'ESLint')).toBeUndefined()
      const phpstan = result.find((t) => t.name === 'PHPStan')
      expect(phpstan?.passFiles).toBe(false)
    })

    // --- commitMsg ---

    it('should return only hook-specific tools for commitMsg', () => {
      const config: HooksConfig = {
        hooks: {
          commitMsg: {
            tools: {
              ESLint: { extensions: ['.ts'] },
            },
          },
        },
      }

      const result = applyConfigOverrides(baseTools, config, 'commitMsg')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('ESLint')
      expect(result[0].extensions).toEqual(['.ts'])
    })
  })

  describe('isHookSkippedByConfig', () => {
    it('should return false with empty config', () => {
      expect(isHookSkippedByConfig('preCommit', {})).toBe(false)
      expect(isHookSkippedByConfig('prePush', {})).toBe(false)
      expect(isHookSkippedByConfig('commitMsg', {})).toBe(false)
    })

    it('should return false when config is null', () => {
      expect(isHookSkippedByConfig('preCommit', null)).toBe(false)
      expect(isHookSkippedByConfig('prePush', null)).toBe(false)
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

    it('should do nothing when config is null', () => {
      delete process.env.GIT_HOOKS_VERBOSE

      applyVerboseSetting(null)

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
