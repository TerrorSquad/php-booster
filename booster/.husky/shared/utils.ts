#!/usr/bin/env zx

/**
 * Shared utilities for git hooks
 * Provides consistent logging, file operations, and tool detection
 */

import { config as dotenvConfig } from 'dotenv'
import { $, chalk, fs, path, ProcessOutput } from 'zx'

// Configure zx behavior
$.verbose = false

// Force chalk to output colors even in non-TTY environments (like CI or WSL)
chalk.level = 3 // Force truecolor support
process.env.FORCE_COLOR = '3'

// Fix locale issues that can occur in VS Code
process.env.LC_ALL = 'C'
process.env.LANG = 'C'

/**
 * Load environment variables from file if it exists
 * Supports .env, .git-hooks.env, or custom file via GIT_HOOKS_ENV_FILE
 */
async function loadEnvironmentFile(): Promise<void> {
  // Check for environment files in order of preference
  let envFile = ''
  if (process.env.GIT_HOOKS_ENV_FILE && await fs.pathExists(process.env.GIT_HOOKS_ENV_FILE)) {
    envFile = process.env.GIT_HOOKS_ENV_FILE
  } else if (await fs.pathExists('.git-hooks.env')) {
    envFile = '.git-hooks.env'
  } else if (await fs.pathExists('.env')) {
    envFile = '.env'
  }

  if (!envFile) return

  try {
    console.log(`ℹ️ Loading environment variables from: ${envFile}`)

    const result = dotenvConfig({ path: envFile })
    if (result.error) throw result.error

    // Check for verbose mode after loading env vars
    const isVerbose = process.env.GIT_HOOKS_VERBOSE === '1' || process.env.GIT_HOOKS_VERBOSE === 'true'

    // Show which variables were injected (only in verbose mode)
    if (isVerbose && result.parsed && Object.keys(result.parsed).length > 0) {
      const injectedVars = Object.keys(result.parsed)
      console.log(`✅ Injected environment variables: ${injectedVars.join(', ')}`)
      injectedVars.forEach(key => {
        console.log(`  ${key}=${result.parsed![key]}`)
      })
    }
  } catch (error) {
    console.log(`⚠️ Failed to load environment file ${envFile}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Load environment variables when module is imported
await loadEnvironmentFile()

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
export async function runWithRunner(
  command: string[],
  options: RunOptions = {},
): Promise<ProcessOutput> {
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
  info: (message: string) => console.log(chalk.blue(`ℹ️ ${message}`)),
  success: (message: string) => console.log(chalk.green(`✅ ${message}`)),
  error: (message: string) => console.log(chalk.red(`❌ ${message}`)),
  warn: (message: string) => console.log(chalk.yellow(`⚠️ ${message}`)),
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
      if (file.endsWith('.php') && !file.startsWith('vendor/') && (await fs.pathExists(file))) {
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
 * Check if a tool or check is explicitly skipped via environment variable
 * @param name Name of the tool/check (will be converted to SKIP_<NAME>)
 */
export function isSkipped(name: string): boolean {
  const skipEnvVar = `SKIP_${name.toUpperCase()}`
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
 * Check if a node_modules binary exists
 * @param toolName Name of the tool
 */
export async function hasNodeBin(toolName: string): Promise<boolean> {
  const binPath = `./node_modules/.bin/${toolName}`
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
 * @param checkVendorBin Whether to verify the tool exists in vendor/bin (default: true)
 * @returns true if tool should run, false if it should be skipped
 */
export async function shouldRunTool(toolName: PHPTool, checkVendorBin: boolean = true): Promise<boolean> {
  if (isSkipped(toolName)) {
    log.skip(`${toolName} skipped (SKIP_${toolName.toUpperCase()} environment variable set)`)
    return false
  }

  if (checkVendorBin && !(await hasVendorBin(toolName))) {
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
export async function runVendorBin(toolName: string, args: string[] = []): Promise<ProcessOutput> {
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
    // Run git add for all files at once for better performance
    await runWithRunner(['git', 'add', ...files], { quiet: true })
  } catch (error: unknown) {
    log.warn(
      `Failed to stage files: ${error instanceof Error ? error.message : String(error)}`,
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
    // Run syntax checks in parallel with concurrency limit to avoid spawning too many processes
    const concurrency = 10
    const chunks = []
    for (let i = 0; i < files.length; i += concurrency) {
      chunks.push(files.slice(i, i + concurrency))
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map((file) => runWithRunner(['php', '-l', file], { quiet: true })))
    }
  })
}

/**
 * Generate Deptrac image and add to git
 */
export async function generateDeptracImage(): Promise<void> {
  try {
    // Use graphviz-image formatter to generate PNG directly
    await runVendorBin('deptrac', ['--formatter=graphviz-image', '--output=deptrac.png'])
    if (await fs.pathExists('./deptrac.png')) {
      await runWithRunner(['git', 'add', 'deptrac.png'], { quiet: true })
      log.info('Added deptrac.png to staging area')
    }
  } catch (error: unknown) {
    // Image generation is optional, don't fail if it doesn't work
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.warn(`Deptrac image generation failed: ${errorMessage}`)
  }
}

/**
 * Generate API documentation if OpenAPI spec has changed
 */
export async function generateApiDocs(): Promise<void> {
  // Check if OpenAPI file was modified
  try {
    const diffResult = await runWithRunner(['git', 'diff', '--name-only'], { quiet: true })
    const modifiedFiles = diffResult.toString().trim().split('\n')

    if (modifiedFiles.includes('documentation/openapi.yml')) {
      log.tool('API Documentation', 'Generating HTML documentation...')

      try {
        await runWithRunner(['pnpm', 'generate:api-doc:html'])
        log.success('HTML documentation generated')

        // Stage the generated files
        await runWithRunner(
          ['git', 'add', 'documentation/openapi.html', 'documentation/openapi.yml'],
          { quiet: true },
        )

        // Check if there are staged changes and commit them
        try {
          await runWithRunner(['git', 'diff', '--cached', '--quiet'], { quiet: true })
          // If we get here, there are no staged changes
          log.info('No staged changes for API documentation')
        } catch {
          // There are staged changes, commit them
          await runWithRunner(['git', 'commit', '-m', 'chore: update API documentation'])
          log.success('API documentation committed')
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        log.error(`HTML documentation generation failed: ${errorMessage}`)
        throw error
      }
    } else {
      log.info('No changes to OpenAPI specification, skipping HTML generation')
    }
  } catch (error: unknown) {
    // Git operations failed, but this is not critical
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.warn(`Could not check for OpenAPI changes: ${errorMessage}`)
  }
}
