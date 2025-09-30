#!/usr/bin/env zx

/**
 * Shared utilities for git hooks
 * Provides consistent logging, file operations, and tool detection
 */

import { $, chalk, fs, path } from 'zx'

// Configure zx behavior
$.verbose = false

// Force chalk to output colors even in non-TTY environments (like CI or WSL)
chalk.level = 3 // Force truecolor support
process.env.FORCE_COLOR = '3'

/**
 * Options for running commands
 */
interface RunOptions {
  quiet?: boolean
}

/**
 * Execute command directly with ZX
 * @param command Array of command parts
 * @param options Execution options
 */
export async function runWithRunner(command: string[], options: RunOptions = {}): Promise<any> {
  const { quiet = false } = options

  // Log command execution if not quiet
  if (!quiet) {
    const commandStr = command.join(' ')
    log.info(`Executing: ${commandStr}`)
  }

  // Set clean environment to avoid locale warnings
  const cleanEnv = {
    ...process.env,
    LC_ALL: 'C',
    LANG: 'C',
  }

  return await $({ stdio: quiet ? 'pipe' : 'inherit', env: cleanEnv })`${command}`
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

    // Filter for PHP files that actually exist
    const phpFiles: string[] = []
    for (const file of allFiles) {
      if (file.endsWith('.php') && !file.includes('/vendor/') && (await fs.pathExists(file))) {
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
 * PHP quality tools - compatible with Node.js TypeScript strip-only mode
 */
export const PHPTool = {
  RECTOR: 'rector',
  ECS: 'ecs',
  PHPSTAN: 'phpstan',
  PSALM: 'psalm',
  DEPTRAC: 'deptrac',
} as const

export type PHPTool = (typeof PHPTool)[keyof typeof PHPTool]

/**
 * Check if a tool is explicitly skipped via environment variable
 * @param toolName Name of the tool
 */
export function isToolSkipped(toolName: PHPTool): boolean {
  const skipEnvVar = `SKIP_${toolName.toUpperCase()}`
  return process.env[skipEnvVar] === '1' || process.env[skipEnvVar] === 'true'
}

/**
 * Check if a vendor binary exists
 * @param toolName Name of the tool
 */
export async function hasVendorBin(toolName: PHPTool | string): Promise<boolean> {
  const binPath = `./vendor/bin/${toolName}`
  return await fs.pathExists(binPath)
}

/**
 * Get available Psalm binary (psalm or psalm.phar)
 * @returns The binary name if found, null if neither exists
 */
export async function getPsalmBinary(): Promise<string | null> {
  if (await hasVendorBin('psalm')) {
    return 'psalm'
  }
  if (await hasVendorBin('psalm.phar')) {
    return 'psalm.phar'
  }
  return null
}

/**
 * Check if a tool should be executed (exists and not skipped)
 * Logs skip reason if tool should not run
 * @param toolName Name of the tool
 * @returns true if tool should run, false if it should be skipped
 */
export async function shouldRunTool(toolName: PHPTool): Promise<boolean> {
  if (isToolSkipped(toolName)) {
    log.skip(`${toolName} skipped (SKIP_${toolName.toUpperCase()} environment variable set)`)
    return false
  }

  if (!(await hasVendorBin(toolName))) {
    log.skip(`${toolName} not found in vendor/bin. Skipping...`)
    return false
  }

  return true
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
 * Format duration in milliseconds to human-readable string
 * @param ms Duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = (ms / 1000).toFixed(1)
  return `${seconds}s`
}

/**
 * Run a tool with consistent error handling, logging, and performance monitoring
 * @param toolName Name of the tool being run
 * @param action Action being performed (e.g., 'Running static analysis...', 'Running code style fixes...')
 * @param fn Function that executes the tool
 */
export async function runTool(
  toolName: string,
  action: string,
  fn: () => Promise<void>,
): Promise<boolean> {
  const startTime = Date.now()

  try {
    log.tool(toolName, action)
    await fn()

    const duration = Date.now() - startTime
    const formattedDuration = formatDuration(duration)
    log.success(`${toolName} completed successfully (${formattedDuration})`)

    return true
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const formattedDuration = formatDuration(duration)
    log.error(`${toolName} failed after ${formattedDuration}`)

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
 * Check PHP syntax for given files
 * @param files Array of PHP file paths to check
 */
export async function checkPhpSyntax(files: string[]): Promise<boolean> {
  if (files.length === 0) {
    return true
  }

  return await runTool('PHP Syntax Check', 'Checking PHP syntax...', async () => {
    for (const file of files) {
      await runWithRunner(['php', '-l', file], { quiet: true })
    }
  })
}
