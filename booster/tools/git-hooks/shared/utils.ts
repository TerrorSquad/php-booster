#!/usr/bin/env zx

/**
 * Shared utilities for git hooks
 * Provides consistent logging, file operations, and tool detection
 */

import { $, fs, path, chalk } from 'zx'

// Configure zx behavior
$.verbose = false

/**
 * Options for running commands
 */
interface RunOptions {
  quiet?: boolean
}

/**
 * Detect if we're in a DDEV environment and DDEV is available
 */
export async function isDdevRunning(): Promise<boolean> {
  try {
    // Check if DDEV is available and we're in a DDEV project
    await $`ddev --version`.quiet()

    // Check if .ddev directory exists (indicates DDEV project)
    return await fs.pathExists('.ddev')
  } catch (error) {
    return false
  }
}

/**
 * Check if we're already inside a DDEV container
 */
export async function isInsideDdevContainer(): Promise<boolean> {
  try {
    const result = await $`hostname`.quiet()
    return result.toString().includes('ddev')
  } catch (error) {
    return false
  }
}

/**
 * Execute command with appropriate runner (DDEV or direct)
 * @param command Array of command parts
 * @param options Execution options
 */
export async function runWithRunner(command: string[], options: RunOptions = {}): Promise<any> {
  const { quiet = false } = options

  // Build command array
  let fullCommand: string[]
  let contextLabel: string

  const isDdev = await isDdevRunning()
  const isContainer = await isInsideDdevContainer()

  if (isDdev && !isContainer) {
    // We're in a DDEV project but not inside container - run via DDEV
    fullCommand = ['ddev', 'exec', ...command]
    contextLabel = 'via DDEV'
  } else {
    // Run directly (either no DDEV or already inside container)
    fullCommand = command
    contextLabel = isContainer ? 'inside DDEV container' : 'direct'
  }

  // Log command execution if not quiet
  if (!quiet) {
    const commandStr = command.join(' ')
    console.log(chalk.cyan(`🔧 Executing (${contextLabel}): ${commandStr}`))
  }

  // Execute with appropriate stdio handling
  if (quiet) {
    return await $({ stdio: 'pipe' })`${fullCommand}`
  } else {
    return await $({ stdio: 'inherit' })`${fullCommand}`
  }
}

/**
 * Logging utilities with consistent formatting
 */
export const log = {
  info: (message: string) => console.log(chalk.blue(`ℹ️  ${message}`)),
  success: (message: string) => console.log(chalk.green(`✅ ${message}`)),
  error: (message: string) => console.log(chalk.red(`❌ ${message}`)),
  warn: (message: string) => console.log(chalk.yellow(`⚠️  ${message}`)),
  step: (message: string) => console.log(chalk.cyan(`📋 ${message}`)),
  tool: (tool: string, message: string) =>
    console.log(chalk.yellow(`🔧 Running ${tool}: ${message}`)),
  celebrate: (message: string) => console.log(chalk.green(`🎉 ${message}`)),
  skip: (message: string) => console.log(chalk.gray(`🚫 ${message}`)),
}

/**
 * Get staged PHP files from git
 */
export async function getStagedPhpFiles(): Promise<string[]> {
  try {
    const result = await runWithRunner(
      ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      { quiet: true },
    )
    const allFiles = result.toString().trim().split('\n').filter(Boolean)

    // Filter for PHP files that actually exist and are not in vendor directory
    const phpFiles: string[] = []
    for (const file of allFiles) {
      if (file.endsWith('.php') && 
          !file.startsWith('vendor/') && 
          (await fs.pathExists(file))) {
        phpFiles.push(file)
      }
    }

    return phpFiles
  } catch (error: unknown) {
    log.error(
      `Failed to get staged files: ${error instanceof Error ? error.message : String(error)}`,
    )
    return []
  }
}

/**
 * Check if a vendor binary exists
 * @param toolName Name of the tool (e.g., 'ecs', 'rector')
 */
export async function hasVendorBin(toolName: string): Promise<boolean> {
  const binPath = `./vendor/bin/${toolName}`
  return await fs.pathExists(binPath)
}

/**
 * Check if a Composer package is installed
 * @param packageName Name of the package (e.g., 'phpunit/phpunit')
 */
export async function hasComposerPackage(packageName: string): Promise<boolean> {
  try {
    const composerLockPath = './composer.lock'
    if (!(await fs.pathExists(composerLockPath))) {
      return false
    }

    const lockContent = await fs.readFile(composerLockPath, 'utf8')
    const lockData = JSON.parse(lockContent)

    // Check in both packages and packages-dev arrays
    const allPackages = [...(lockData.packages || []), ...(lockData['packages-dev'] || [])]

    return allPackages.some((pkg: any) => pkg.name === packageName)
  } catch (error: unknown) {
    return false
  }
}

/**
 * Run a vendor binary with appropriate runner
 * @param toolName Name of the tool
 * @param args Arguments to pass to the tool
 */
export async function runVendorBin(toolName: string, args: string[] = []): Promise<any> {
  const command = [`./vendor/bin/${toolName}`, ...args]
  return await runWithRunner(command)
}

/**
 * Get current git branch name
 */
export async function getCurrentBranch(): Promise<string> {
  try {
    const result = await runWithRunner(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
      quiet: true,
    })
    return result.toString().trim()
  } catch (error: unknown) {
    throw new Error(
      `Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Run a tool with consistent error handling and logging
 * @param toolName Name of the tool being run
 * @param fn Function that executes the tool
 */
export async function runTool(toolName: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn()
    return true
  } catch (error: unknown) {
    log.error(`${toolName} failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
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
    for (const file of files) {
      await runWithRunner(['git', 'add', file], { quiet: true })
    }
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
    const gitDir = await runWithRunner(['git', 'rev-parse', '--git-dir'], { quiet: true })
    const mergeHead = path.join(gitDir.toString().trim(), 'MERGE_HEAD')

    if (await fs.pathExists(mergeHead)) {
      return true
    }
  } catch (error) {
    // Not in a git repository or other git error
  }

  return false
}

/**
 * Run tool on files and exit if unsuccessful
 * @param toolName Name of the tool
 * @param files Files to process
 * @param fn Function to execute the tool
 */
export async function runToolOnFiles(
  toolName: string,
  files: string[],
  fn: (files: string[]) => Promise<void>,
): Promise<void> {
  if (files.length === 0) {
    log.info(`No staged PHP files found. Skipping ${toolName}.`)
    return
  }

  const success = await runTool(toolName, () => fn(files))

  if (!success) {
    log.error(`${toolName} checks failed. Please fix the issues and try again.`)
    process.exit(1)
  }
}

/**
 * Check PHP syntax for given files
 * @param files Array of PHP file paths to check
 */
export async function checkPhpSyntax(files: string[]): Promise<boolean> {
  if (files.length === 0) {
    return true
  }

  return await runTool('PHP Syntax Check', async () => {
    log.tool('PHP Lint', 'Checking syntax...')

    for (const file of files) {
      try {
        await runWithRunner(['php', '-l', file], { quiet: true })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        log.error(`Syntax error in ${file}: ${errorMessage}`)
        throw error
      }
    }

    log.success('PHP syntax check passed')
  })
}

/**
 * Exit with error if checks failed
 * @param allSuccessful Whether all checks passed
 */
export function exitIfChecksFailed(allSuccessful: boolean): void {
  if (!allSuccessful) {
    log.error('Some pre-commit checks failed. Please fix the issues and try again.')
    process.exit(1)
  }

  log.celebrate('All pre-commit checks passed!')
}
