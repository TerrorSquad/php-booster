import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateDeptracImage, generateApiDocs } from '../../shared/extras'
import { exec, log } from '../../shared/core'
import { fs } from 'zx'

// Mock dependencies
vi.mock('../../shared/core', () => ({
  exec: vi.fn(),
  log: {
    tool: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    skip: vi.fn()
  }
}))

vi.mock('zx', () => ({
  fs: {
    pathExists: vi.fn(),
    stat: vi.fn().mockResolvedValue({ mtimeMs: 0 })
  }
}))

describe('extras.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 0 } as any)
  })

  describe('generateDeptracImage', () => {
    it('should return not generated if deptrac not installed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false)

      const result = await generateDeptracImage()

      expect(result).toEqual({ generated: false, changed: false })
      expect(exec).not.toHaveBeenCalled()
      expect(log.skip).toHaveBeenCalled()
    })

    it('should generate image and return success if installed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      // First stat call (mtimeBefore) returns 0, second (mtimeAfter) returns a later time
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ mtimeMs: 0 } as any)
        .mockResolvedValueOnce({ mtimeMs: 1000 } as any)
      vi.mocked(exec)
        .mockResolvedValueOnce(undefined as any)  // deptrac run
        .mockResolvedValueOnce({ toString: () => 'deptrac.png' } as any)  // git diff

      const result = await generateDeptracImage()

      expect(exec).toHaveBeenCalledWith(
        ['./vendor/bin/deptrac', '--formatter=graphviz-image', '--output=deptrac.png'],
        { type: 'php' }
      )
      expect(result).toEqual({ generated: true, changed: true, path: 'deptrac.png' })
      expect(log.success).toHaveBeenCalledWith(expect.stringContaining('deptrac.png'))
    })

    it('should NOT auto-commit (removed behavior)', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ mtimeMs: 0 } as any)
        .mockResolvedValueOnce({ mtimeMs: 1000 } as any)
      vi.mocked(exec)
        .mockResolvedValueOnce(undefined as any)
        .mockResolvedValueOnce({ toString: () => '' } as any)

      await generateDeptracImage()

      // Verify no git add or git commit calls
      const execCalls = vi.mocked(exec).mock.calls
      const gitCalls = execCalls.filter(call => call[0][0] === 'git' && (call[0][1] === 'add' || call[0][1] === 'commit'))
      expect(gitCalls).toHaveLength(0)
    })

    it('should handle errors gracefully and return not generated', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      // mtimeBefore stat call succeeds, then exec throws, then mtimeAfter stat also returns same value (no change)
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 0 } as any)
      vi.mocked(exec)
        .mockRejectedValueOnce(new Error('generation failed'))  // deptrac run fails
        .mockResolvedValueOnce({ toString: () => '' } as any)  // git diff in error handler

      const result = await generateDeptracImage()

      expect(result).toEqual({ generated: false, changed: false })
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('generation failed'))
    })
  })

  describe('generateApiDocs', () => {
    it('should return not generated if swagger-php not installed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false)

      const result = await generateApiDocs()

      expect(result).toEqual({ generated: false, changed: false })
      expect(log.skip).toHaveBeenCalledWith(expect.stringContaining('not installed'))
    })

    it('should return generated but not changed if spec unchanged', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockResolvedValueOnce({} as any) // generate-api-spec
        .mockResolvedValueOnce({ toString: () => 'other-file.php' } as any) // git diff

      const result = await generateApiDocs()

      expect(result).toEqual({ generated: true, changed: false })
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('No changes'))
    })

    it('should generate HTML and return changed if spec changed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockResolvedValueOnce({} as any) // generate-api-spec
        .mockResolvedValueOnce({ toString: () => 'openapi/openapi.yml' } as any) // git diff
        .mockResolvedValueOnce({} as any) // generate html

      const result = await generateApiDocs()

      expect(exec).toHaveBeenCalledWith(['pnpm', 'generate:api-doc:html'])
      expect(result).toEqual({ generated: true, changed: true, path: 'openapi/openapi.yml' })
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Remember to commit'))
    })

    it('should NOT auto-commit (removed behavior)', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockResolvedValueOnce({} as any) // generate-api-spec
        .mockResolvedValueOnce({ toString: () => 'openapi/openapi.yml' } as any) // git diff
        .mockResolvedValueOnce({} as any) // generate html

      await generateApiDocs()

      // Verify no git add or git commit calls
      const execCalls = vi.mocked(exec).mock.calls
      const gitCommitCalls = execCalls.filter(call =>
        call[0][0] === 'git' && call[0][1] === 'commit'
      )
      expect(gitCommitCalls).toHaveLength(0)
    })

    it('should throw if HTML generation fails', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockResolvedValueOnce({} as any) // generate-api-spec
        .mockResolvedValueOnce({ toString: () => 'openapi/openapi.yml' } as any) // git diff
        .mockRejectedValueOnce(new Error('html gen failed')) // generate html fails

      await expect(generateApiDocs()).rejects.toThrow('html gen failed')
      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('failed'))
    })

    it('should throw on spec generation error', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockRejectedValue(new Error('fatal error'))

      await expect(generateApiDocs()).rejects.toThrow('fatal error')
      expect(log.error).toHaveBeenCalled()
    })
  })
})
