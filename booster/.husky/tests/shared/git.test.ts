import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCurrentBranch,
  stageFiles,
  shouldSkipDuringMerge,
  getStagedFiles
} from '../../shared/git'
import { exec } from '../../shared/core'
import { fs, path } from 'zx'

// Mock dependencies
vi.mock('../../shared/core', () => ({
  exec: vi.fn(),
  log: {
    warn: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('zx', () => ({
  fs: {
    pathExists: vi.fn()
  },
  path: {
    join: (...args: string[]) => args.join('/')
  }
}))

describe('git.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentBranch', () => {
    it('should return clean branch name', async () => {
      vi.mocked(exec).mockResolvedValue({ toString: () => 'feature/test-branch\n' } as any)

      const branch = await getCurrentBranch()
      expect(branch).toBe('feature/test-branch')
    })

    it('should handle git warnings in output', async () => {
      vi.mocked(exec).mockResolvedValue({
        toString: () => 'warning: some git warning\nfeature/test-branch\n'
      } as any)

      const branch = await getCurrentBranch()
      expect(branch).toBe('feature/test-branch')
    })

    it('should throw error on invalid branch name', async () => {
      vi.mocked(exec).mockResolvedValue({ toString: () => 'warning: error occurred' } as any)

      await expect(getCurrentBranch()).rejects.toThrow('Invalid branch name detected')
    })
  })

  describe('stageFiles', () => {
    it('should do nothing if file list is empty', async () => {
      await stageFiles([])
      expect(exec).not.toHaveBeenCalled()
    })

    it('should call git add for files', async () => {
      await stageFiles(['file1.php', 'file2.php'])
      expect(exec).toHaveBeenCalledWith(
        ['git', 'add', 'file1.php', 'file2.php'],
        { quiet: true }
      )
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(exec).mockRejectedValue(new Error('git add failed'))
      // Should not throw
      await stageFiles(['file1.php'])
    })
  })

  describe('shouldSkipDuringMerge', () => {
    it('should return true if MERGE_HEAD exists', async () => {
      vi.mocked(exec).mockResolvedValue({ toString: () => '.git' } as any)
      vi.mocked(fs.pathExists).mockResolvedValue(true)

      expect(await shouldSkipDuringMerge()).toBe(true)
    })

    it('should return false if MERGE_HEAD does not exist', async () => {
      vi.mocked(exec).mockResolvedValue({ toString: () => '.git' } as any)
      vi.mocked(fs.pathExists).mockResolvedValue(false)

      expect(await shouldSkipDuringMerge()).toBe(false)
    })
  })

  describe('getStagedFiles', () => {
    it('should return filtered list of files', async () => {
      vi.mocked(exec).mockResolvedValue({
        toString: () => 'src/test.php\nsrc/style.css\nvendor/lib.php\n'
      } as any)

      const files = await getStagedFiles('.php')
      expect(files).toEqual(['src/test.php'])
      // vendor/lib.php should be excluded by default logic
      // src/style.css should be excluded by extension filter
    })

    it('should return all files if no extension provided', async () => {
      vi.mocked(exec).mockResolvedValue({
        toString: () => 'src/test.php\nsrc/style.css\n'
      } as any)

      const files = await getStagedFiles()
      expect(files).toEqual(['src/test.php', 'src/style.css'])
    })

    it('should return empty array on error', async () => {
      vi.mocked(exec).mockRejectedValue(new Error('git error'))

      const files = await getStagedFiles()
      expect(files).toEqual([])
    })
  })
})
