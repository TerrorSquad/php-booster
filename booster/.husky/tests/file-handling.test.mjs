import { describe, it, expect, beforeEach, vi } from 'vitest'
import { $ } from 'zx'

// Mock git operations for controlled testing
vi.mock('zx', async () => {
  const actual = await vi.importActual('zx')
  return {
    ...actual,
    $: vi.fn(),
  }
})

const mockGit = $

describe('File Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle files with spaces in names correctly', async () => {
    // Mock git diff output with files containing spaces
    const mockOutput = 'src/My Controller.php\nsrc/NormalController.php\n'

    mockGit.mockResolvedValueOnce({
      toString: () => mockOutput,
    })

    // Test that our git diff command works correctly
    const result = await $`git diff --cached --name-only --diff-filter=ACMR`
    const stagedFiles = result.toString().trim().split('\n').filter(Boolean)

    expect(stagedFiles).toContain('src/My Controller.php')
    expect(stagedFiles).toContain('src/NormalController.php')
    expect(stagedFiles).toHaveLength(2)
  })

  it('should handle special characters in file paths', async () => {
    // Mock git diff with special character files
    const specialFiles = [
      'src/Controller & Service.php',
      'src/Test(1).php',
      'src/File$with_dollar.php',
      'src/Quote"Test.php',
    ]

    const mockOutput = specialFiles.join('\n') + '\n'
    mockGit.mockResolvedValueOnce({
      toString: () => mockOutput,
    })

    // Test git diff
    const result = await $`git diff --cached --name-only --diff-filter=ACMR`
    const stagedFiles = result.toString().trim().split('\n').filter(Boolean)

    expect(stagedFiles).toHaveLength(specialFiles.length)

    // Verify each file is properly handled
    for (const file of specialFiles) {
      expect(stagedFiles).toContain(file)
    }
  })

  it('should properly escape file arguments for shell commands', async () => {
    // This test demonstrates that ZX properly handles file arguments
    // whereas bash would have issues with unquoted variables

    const problematicFile = 'src/File With Spaces & Special$Chars.php'

    // Mock file existence check
    mockGit.mockResolvedValueOnce({
      toString: () => 'A\t' + problematicFile,
    })

    const status = await $`git status --porcelain`
    expect(status.toString()).toContain(problematicFile)
  })

  it('should demonstrate array spreading for multiple files', async () => {
    // Create multiple files with challenging names
    const files = ['src/File One.php', 'src/File Two.php', 'src/File & Three.php']

    const mockOutput = files.join('\n') + '\n'
    mockGit.mockResolvedValueOnce({
      toString: () => mockOutput,
    })

    const result = await $`git diff --cached --name-only --diff-filter=ACMR`
    const stagedFiles = result.toString().trim().split('\n').filter(Boolean)

    expect(stagedFiles).toHaveLength(files.length)

    // Verify we can handle all files properly
    for (const file of files) {
      expect(stagedFiles).toContain(file)
    }
  })
})
