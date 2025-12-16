import { fs, path } from 'zx'
import { log, runWithRunner } from './core.ts'

/**
 * Get current git branch name
 */
export async function getCurrentBranch(): Promise<string> {
  try {
    const result = await runWithRunner(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
      quiet: true,
    })

    // Clean the result to handle any locale warnings or extra output
    const branchName = result.toString().trim()

    // Extract just the last line if there are multiple lines (locale warnings, etc.)
    const lines = branchName.split('\n').filter((line: string) => line.trim() !== '')
    const cleanBranchName = lines[lines.length - 1].trim()

    // Additional validation to ensure we have a valid branch name
    if (
      !cleanBranchName ||
      cleanBranchName.includes('warning:') ||
      cleanBranchName.includes('error:')
    ) {
      throw new Error(`Invalid branch name detected: "${cleanBranchName}"`)
    }

    return cleanBranchName
  } catch (error: unknown) {
    throw new Error(
      `Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Stage files after tool modifications
 * @param files Array of file paths to stage
 */
export async function stageFiles(files: string[]): Promise<void> {
  if (files.length === 0) return

  try {
    // Run git add inside DDEV container for consistency with tool execution
    await runWithRunner(['git', 'add', ...files], { quiet: true })
  } catch (error: unknown) {
    log.warn(
      `Failed to stage some files: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Check if we're in a merge state and should skip checks
 */
export async function shouldSkipDuringMerge(): Promise<boolean> {
  try {
    const gitDir = await runWithRunner(['git', 'rev-parse', '--git-dir'], {
      quiet: true,
    })
    const mergeHead = path.join(gitDir.toString().trim(), 'MERGE_HEAD')

    if (await fs.pathExists(mergeHead)) {
      return true
    }
  } catch {
    // Not in a git repository or other git error
  }

  return false
}

/**
 * Get staged files from git
 *
 * Uses `git diff --cached` to find files that are staged for commit.
 * Filters out deleted files and files that don't exist on disk.
 *
 * @param extension Optional extension to filter by (e.g. '.php')
 * @returns Array of absolute file paths
 */
export async function getStagedFiles(extension?: string): Promise<string[]> {
  try {
    const result = await runWithRunner(
      ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      {
        quiet: true,
      },
    )
    const allFiles = result.toString().trim().split('\n').filter(Boolean)

    // Filter for files that actually exist and match extension
    const filteredFiles: string[] = []
    for (const file of allFiles) {
      if (
        (!extension || file.endsWith(extension)) &&
        !file.startsWith('vendor/') &&
        !file.startsWith('node_modules/')
      ) {
        filteredFiles.push(file)
      }
    }

    return filteredFiles
  } catch (error: unknown) {
    log.error(
      `Failed to get staged files: ${error instanceof Error ? error.message : String(error)}`,
    )
    return []
  }
}
