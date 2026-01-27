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
    error: vi.fn()
  }
}))

vi.mock('zx', () => ({
  fs: {
    pathExists: vi.fn()
  }
}))

describe('extras.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateDeptracImage', () => {
    it('should skip if deptrac not installed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false)
      await generateDeptracImage()
      expect(exec).not.toHaveBeenCalled()
    })

    it('should generate image if installed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockResolvedValue({ toString: () => '' } as any)

      await generateDeptracImage()

      expect(exec).toHaveBeenCalledWith(
        ['./vendor/bin/deptrac', '--formatter=graphviz-image', '--output=deptrac.png'],
        { type: 'php' }
      )
    })

    it('should commit if image changed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      // Mock exec sequence:
      // 1. generate image
      // 2. git add
      // 3. git diff (throws if changes exist)
      // 4. git commit
      vi.mocked(exec)
        .mockResolvedValueOnce({} as any) // generate
        .mockResolvedValueOnce({} as any) // add
        .mockRejectedValueOnce(new Error('diff failed')) // diff (changes exist)
        .mockResolvedValueOnce({} as any) // commit

      await generateDeptracImage()

      expect(exec).toHaveBeenCalledWith(['git', 'commit', '-m', 'chore: update deptrac image'])
      expect(log.success).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockRejectedValue(new Error('generation failed'))

      await generateDeptracImage()

      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('generation failed'))
    })
  })

  describe('generateApiDocs', () => {
    it('should skip if swagger-php not installed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false)
      await generateApiDocs()
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('not installed'))
    })

    it('should skip HTML generation if spec not changed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockResolvedValueOnce({} as any) // generate-api-spec
        .mockResolvedValueOnce({ toString: () => 'other-file.php' } as any) // git diff

      await generateApiDocs()

      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('No changes'))
    })

    it('should generate HTML and commit if spec changed', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockResolvedValueOnce({} as any) // generate-api-spec
        .mockResolvedValueOnce({ toString: () => 'openapi/openapi.yml' } as any) // git diff
        .mockResolvedValueOnce({} as any) // generate html
        .mockResolvedValueOnce({} as any) // git add
        .mockRejectedValueOnce(new Error('diff failed')) // git diff (changes exist)
        .mockResolvedValueOnce({} as any) // git commit

      await generateApiDocs()

      expect(exec).toHaveBeenCalledWith(['pnpm', 'generate:api-doc:html'])
      expect(exec).toHaveBeenCalledWith(['git', 'commit', '-m', 'chore: update API documentation'])
    })

    it('should log info if no staged changes after generation', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockResolvedValueOnce({} as any) // generate-api-spec
        .mockResolvedValueOnce({ toString: () => 'openapi/openapi.yml' } as any) // git diff (spec changed)
        .mockResolvedValueOnce({} as any) // generate html
        .mockResolvedValueOnce({} as any) // git add
        .mockResolvedValueOnce({} as any) // git diff (no staged changes)

      await generateApiDocs()

      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('No staged changes'))
    })

    it('should throw if HTML generation fails', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec)
        .mockResolvedValueOnce({} as any) // generate-api-spec
        .mockResolvedValueOnce({ toString: () => 'openapi/openapi.yml' } as any) // git diff
        .mockRejectedValueOnce(new Error('html gen failed')) // generate html fails

      await expect(generateApiDocs()).rejects.toThrow('html gen failed')
      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('HTML documentation generation failed'))
    })

    it('should throw on error', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true)
      vi.mocked(exec).mockRejectedValue(new Error('fatal error'))

      await expect(generateApiDocs()).rejects.toThrow('fatal error')
      expect(log.error).toHaveBeenCalled()
    })
  })
})
