import type { ProcessOutput } from 'zx'
import { $, chalk, fs, which } from 'zx'

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
  tool: (tool: string, message: string) =>
    console.log(chalk.yellow(`🔧 Running ${tool}: ${message}`)),
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

    process.loadEnvFile(envFile)

    // Check for verbose mode after loading env vars
    const isVerbose =
      process.env.GIT_HOOKS_VERBOSE === '1' || process.env.GIT_HOOKS_VERBOSE === 'true'

    if (isVerbose) {
      log.success(`Successfully loaded environment variables from ${envFile}`)
    }
  } catch (error) {
    log.warn(
      `Failed to load environment file ${envFile}: ${error instanceof Error ? error.message : String(error)}`,
    )
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

  return await $({
    stdio: quiet ? 'pipe' : 'inherit',
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

/**
 * Check if the current project is a DDEV project
 */
export async function isDdevProject(): Promise<boolean> {
  const hasConfig = await fs.pathExists('.ddev/config.yaml')
  if (!hasConfig) return false

  try {
    await which('ddev')
    return true
  } catch {
    return false
  }
}

/**
 * Get the DDEV project name from .ddev/config.yaml
 */
async function getDdevProjectName(): Promise<string | null> {
  try {
    const configPath = '.ddev/config.yaml'
    const configContent = await fs.readFile(configPath, 'utf-8')
    const match = configContent.match(/^name:\s*(.+)$/m)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

/**
 * Get the command to execute, wrapping in ddev exec if necessary
 * @param command The command parts (e.g. ['php', '-v'])
 * @param type The tool type ('node', 'php', 'system')
 */
export async function getExecCommand(command: string[], type: string): Promise<string[]> {
  if (type !== 'php') {
    return command
  }

  if (await isDdevProject()) {
    const projectName = await getDdevProjectName()
    if (projectName) {
      // Use docker exec for performance instead of ddev exec
      // Run as current user to avoid permission issues with generated files
      const uid = process.getuid ? process.getuid() : 1000
      const gid = process.getgid ? process.getgid() : 1000
      const containerName = `ddev-${projectName}-web`

      // Adjust command path for docker exec
      // If command is not 'php' or 'composer' and doesn't start with '/', assume it's in vendor/bin
      let cmd = command[0]
      if (cmd !== 'php' && cmd !== 'composer' && !cmd.startsWith('/') && !cmd.startsWith('./')) {
        cmd = `vendor/bin/${cmd}`
      }

      const newCommand = [cmd, ...command.slice(1)]

      return [
        'docker',
        'exec',
        '-t',
        '-u',
        `${uid}:${gid}`,
        '-w',
        '/var/www/html',
        containerName,
        ...newCommand,
      ]
    }

    throw new Error('Could not determine DDEV project name from .ddev/config.yaml')
  }

  return command
}

/**
 * Ensure Mutagen sync is complete if enabled
 */
export async function ensureMutagenSync(): Promise<void> {
  if (await isDdevProject()) {
    try {
      // Attempt to sync mutagen. This will fail if mutagen is not enabled, which is fine.
      // We use 'ddev mutagen sync' which forces a sync.
      await runWithRunner(['ddev', 'mutagen', 'sync'], { quiet: true })
    } catch {
      // Ignore errors (e.g. mutagen not enabled)
    }
  }
}
