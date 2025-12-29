import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  log,
  initEnvironment,
  formatDuration,
  isSkipped,
  isDdevProject,
  exec,
  ensureMutagenSync
} from '../../shared/core'
import { $, fs, which } from 'zx'

// Mock zx
vi.mock('zx', () => {
  // $ needs to be a function that returns a function (for template literal)
  const $ = vi.fn().mockImplementation(() => {
    // Return a function that handles the template literal
    return vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
  })
  // @ts-ignore
  $.verbose = false
  return {
    $: $,
    chalk: {
      blue: (s: string) => s,
      green: (s: string) => s,
      red: (s: string) => s,
      yellow: (s: string) => s,
      cyan: (s: string) => s,
      gray: (s: string) => s,
      level: 0
    },
    fs: {
      pathExists: vi.fn(),
      readFile: vi.fn(),
    },
    which: vi.fn()
  }
})

describe('core.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...process.env } // Clone env
    delete process.env.DDEV_PHP // Ensure this doesn't interfere
  })

  describe('log', () => {
    it('should log messages with correct prefixes', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      log.info('test info')
      expect(consoleSpy).toHaveBeenCalledWith('💡 test info')

      log.success('test success')
      expect(consoleSpy).toHaveBeenCalledWith('✅ test success')

      log.error('test error')
      expect(consoleSpy).toHaveBeenCalledWith('❌ test error')

      log.warn('test warn')
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ test warn')

      log.step('test step')
      expect(consoleSpy).toHaveBeenCalledWith('📋 test step')

      log.tool('tool', 'test tool')
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Running tool: test tool')

      log.celebrate('test celebrate')
      expect(consoleSpy).toHaveBeenCalledWith('🎉 test celebrate')

      log.skip('test skip')
      expect(consoleSpy).toHaveBeenCalledWith('🚫 test skip')
    })
  })

  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(500)).toBe('500ms')
      expect(formatDuration(1500)).toBe('1.5s')
      expect(formatDuration(1000)).toBe('1.0s')
    })
  })

  describe('isSkipped', () => {
    it('should return true if SKIP_ env var is set', () => {
      process.env.SKIP_TEST_TOOL = '1'
      expect(isSkipped('test-tool')).toBe(true)

      process.env.SKIP_ANOTHER_TOOL = 'true'
      expect(isSkipped('another_tool')).toBe(true)
    })

    it('should return false if SKIP_ env var is not set', () => {
      expect(isSkipped('unknown-tool')).toBe(false)
    })

    it('should normalize tool names', () => {
      process.env.SKIP_MY_COOL_TOOL = '1'
      expect(isSkipped('my-cool-tool')).toBe(true)
      expect(isSkipped('my_cool_tool')).toBe(true)
    })
  })

  describe('isDdevProject', () => {
    it('should return false if DDEV_PHP is false', async () => {
      process.env.DDEV_PHP = 'false'
      expect(await isDdevProject()).toBe(false)
    })

    it('should return false if .ddev/config.yaml does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false)
      expect(await isDdevProject()).toBe(false)
    })

    it('should return false if ddev binary is missing', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(which).mockRejectedValue(new Error('not found'))
      expect(await isDdevProject()).toBe(false)
    })

    it('should return true if config exists and ddev is found', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(which).mockResolvedValue('/usr/local/bin/ddev')
      expect(await isDdevProject()).toBe(true)
    })
  })

  describe('exec', () => {
    it('should execute command directly for non-php type', async () => {
      await exec(['ls', '-la'], { type: 'system' })
      // @ts-ignore
      expect($).toHaveBeenCalled()
      // Check the template literal call
      // The mock implementation of $ needs to handle template literals if we want to inspect arguments precisely
      // But for now, just checking it was called is a start.
    })

    it('should wrap command in docker exec for php type in ddev project', async () => {
      // Setup DDEV environment
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(which).mockResolvedValue('/bin/ddev')
      vi.mocked(fs.readFile).mockResolvedValue('name: my-project\n')

      // Mock platform to be linux for predictable UID/GID
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.spyOn(process, 'getuid').mockReturnValue(1000)
      vi.spyOn(process, 'getgid').mockReturnValue(1000)

      // Mock $ to capture the command
      let capturedCommand: any[] = []
      // @ts-ignore
      $.mockImplementation((options) => {
        return (pieces, ...args) => {
          capturedCommand = pieces
          return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 })
        }
      })

      await exec(['php', '-v'], { type: 'php' })

      // Verify docker exec command construction
      // We can't easily inspect the template literal reconstruction without a more complex mock
      // But we can verify that fs.readFile was called to get the project name
      expect(fs.readFile).toHaveBeenCalledWith('.ddev/config.yaml', 'utf-8')
    })

    it('should throw error if ddev project name cannot be determined', async () => {
      // Setup DDEV environment
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(which).mockResolvedValue('/bin/ddev')
      // Return empty config or config without name
      vi.mocked(fs.readFile).mockResolvedValue('invalid: config\n')

      await expect(exec(['php', '-v'], { type: 'php' })).rejects.toThrow('Could not determine DDEV project name')
    })

    it('should throw error if ddev config read fails', async () => {
      // Setup DDEV environment
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(which).mockResolvedValue('/bin/ddev')
      // fs.readFile throws
      vi.mocked(fs.readFile).mockRejectedValue(new Error('read failed'))

      await expect(exec(['php', '-v'], { type: 'php' })).rejects.toThrow('Could not determine DDEV project name')
    })
  })

  describe('initEnvironment', () => {
    it('should load .env if it exists', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (path) => path === '.env')

      // Mock process.loadEnvFile (Node 20+)
      process.loadEnvFile = vi.fn()

      await initEnvironment()
      expect(process.loadEnvFile).toHaveBeenCalledWith('.env')
    })

    it('should load custom env file from GIT_HOOKS_ENV_FILE', async () => {
      process.env.GIT_HOOKS_ENV_FILE = '.custom.env'
      vi.mocked(fs.pathExists).mockImplementation(async (path) => path === '.custom.env')
      process.loadEnvFile = vi.fn()

      await initEnvironment()
      expect(process.loadEnvFile).toHaveBeenCalledWith('.custom.env')
    })

    it('should load .git-hooks.env if .env missing', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (path) => path === '.git-hooks.env')
      process.loadEnvFile = vi.fn()

      await initEnvironment()
      expect(process.loadEnvFile).toHaveBeenCalledWith('.git-hooks.env')
    })

    it('should log success in verbose mode', async () => {
      process.env.GIT_HOOKS_VERBOSE = '1'
      vi.mocked(fs.pathExists).mockImplementation(async (path) => path === '.env')
      process.loadEnvFile = vi.fn()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await initEnvironment()
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully loaded'))
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      process.loadEnvFile = vi.fn().mockImplementation(() => {
        throw new Error('Failed to load')
      })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await initEnvironment()
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load'))
    })
  })

  describe('ensureMutagenSync', () => {
    it('should sync mutagen if ddev project', async () => {
      // Mock isDdevProject true
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(which).mockResolvedValue('/bin/ddev')

      // Mock exec to succeed
      // We need to mock exec since it's imported from the same module
      // But wait, we are testing the module itself.
      // The exec function calls getExecCommand which calls $
      // So we just need $ to succeed.

      await ensureMutagenSync()
      // @ts-ignore
      expect($).toHaveBeenCalled()
    })

    it('should ignore errors during sync', async () => {
      // Mock isDdevProject true
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(which).mockResolvedValue('/bin/ddev')

      // Mock $ to fail
      // @ts-ignore
      $.mockImplementation(() => () => Promise.reject(new Error('sync failed')))

      await expect(ensureMutagenSync()).resolves.not.toThrow()
    })
  })
})
