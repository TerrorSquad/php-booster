import { config as dotenvConfig } from 'dotenv'
import type { ProcessOutput } from 'zx'
import { $, chalk, fs } from 'zx'

// Configure zx behavior
$.verbose = false

// Force chalk to output colors even in non-TTY environments (like CI or WSL)
chalk.level = 3 // Force truecolor support
process.env.FORCE_COLOR = '3'

/**
 * Logging utilities with consistent formatting
 * Uses chalk for colored output
 */
export const log = {
  info: (message: string) => console.log(chalk.blue(`💡 ${message}`)),
  success: (message: string) => console.log(chalk.green(`✅ ${message}`)),
  error: (message: string) => console.log(chalk.red(`❌ ${message}`)),
  warn: (message: string) => console.log(chalk.yellow(`⚠️ ${message}`)),
  step: (message: string) => console.log(chalk.cyan(`📋 ${message}`)),
  tool: (tool: string, message: string) => console.log(chalk.yellow(`🔧 Running ${tool}: ${message}`)),
  celebrate: (message: string) => console.log(chalk.green(`🎉 ${message}`)),
  skip: (message: string) => console.log(chalk.gray(`🚫 ${message}`)),
}

/**
 * Load environment variables from file if it exists
 * Supports .env, .git-hooks.env, or custom file via GIT_HOOKS_ENV_FILE
 */
export async function initEnvironment(): Promise<void> {
  // Check for environment files in order of preference
  let envFile = ''
  if (process.env.GIT_HOOKS_ENV_FILE && (await fs.pathExists(process.env.GIT_HOOKS_ENV_FILE))) {
    envFile = process.env.GIT_HOOKS_ENV_FILE
  } else if (await fs.pathExists('.git-hooks.env')) {
    envFile = '.git-hooks.env'
  } else if (await fs.pathExists('.env')) {
    envFile = '.env'
  }

  if (!envFile) return

  try {
    log.info(`Loading environment variables from: ${envFile}`)

    const result = dotenvConfig({ path: envFile })
    if (result.error) throw result.error

    // Check for verbose mode after loading env vars
    const isVerbose = process.env.GIT_HOOKS_VERBOSE === '1' || process.env.GIT_HOOKS_VERBOSE === 'true'

    // Show which variables were injected (only in verbose mode)
    if (isVerbose && result.parsed && Object.keys(result.parsed).length > 0) {
      const injectedVars = Object.keys(result.parsed)
      log.success(`Injected environment variables: ${injectedVars.join(', ')}`)
      injectedVars.forEach((key) => {
        console.log(`  ${key}=${result.parsed![key]}`)
      })
    }
  } catch (error) {
    log.warn(`Failed to load environment file ${envFile}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Options for running commands
 */
export interface RunOptions {
  quiet?: boolean
}

/**
 * Execute command directly with ZX
 * @param command Array of command parts
 * @param options Execution options
 */
export async function runWithRunner(command: string[], options: RunOptions = {}): Promise<ProcessOutput> {
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

  return await $({
    stdio: quiet ? 'pipe' : 'inherit',
    env: cleanEnv,
  })`${command}`
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
 * Check if a tool or check is explicitly skipped via environment variable
 * @param name Name of the tool/check (will be converted to SKIP_<NAME>)
 */
export function isSkipped(name: string): boolean {
  // Normalize name -> uppercase, replace non-alphanum with underscore, collapse multiple underscores
  const normalized = String(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const skipEnvVar = `SKIP_${normalized}`
  return process.env[skipEnvVar] === '1' || process.env[skipEnvVar] === 'true'
}
