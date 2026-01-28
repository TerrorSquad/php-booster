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
    // Capture env vars before loading
    const envBefore = new Set(Object.keys(process.env))

    log.info(`Loading environment variables from: ${envFile}`)

    process.loadEnvFile(envFile)

    // Check for verbose mode after loading env vars
    const isVerbose =
      process.env.GIT_HOOKS_VERBOSE === '1' || process.env.GIT_HOOKS_VERBOSE === 'true'

    if (isVerbose) {
      log.success(`Successfully loaded environment variables from ${envFile}`)

      // Log any SKIP_* variables that were loaded
      const skipVars = Object.keys(process.env)
        .filter((key) => key.startsWith('SKIP_') && !envBefore.has(key))
        .map((key) => `${key}=${process.env[key]}`)
      if (skipVars.length > 0) {
        log.info(`Found skip variables: ${skipVars.join(', ')}`)
      }
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
  type?: 'php' | 'node' | 'system'
}

/**
 * Execute command directly with ZX
 * @param command Array of command parts
 * @param options Execution options
 * @throws Error if command execution fails
 * @returns The process output
 */
export async function exec(
  command: string[],
  options: RunOptions = {},
): Promise<ProcessOutput> {
  const { quiet = false, type = 'system' } = options

  const finalCommand = await getExecCommand(command, type)

  // Log command execution if not quiet
  if (!quiet) {
    const commandStr = finalCommand.join(' ')
    log.info(`Executing: ${commandStr}`)
  }

  return await $({
    stdio: quiet ? 'pipe' : 'inherit',
  })`${finalCommand}`
}

/**
 * Format duration in milliseconds to human-readable string
 * @param ms Duration in milliseconds
 * @returns Formatted string (e.g. "1.5s" or "500ms")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = (ms / 1000).toFixed(1)
  return `${seconds}s`
}

/**
 * Get the normalized skip environment variable name for a tool
 * @param name Name of the tool/check
 * @returns The environment variable name (e.g., "SKIP_DEPTRAC")
 */
export function getSkipEnvVar(name: string): string {
  const normalized = String(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `SKIP_${normalized}`
}

/**
 * Check if a tool or check is explicitly skipped via environment variable
 * @param name Name of the tool/check (will be converted to SKIP_<NAME>)
 * @returns True if the tool should be skipped
 */
export function isSkipped(name: string): boolean {
  const skipEnvVar = getSkipEnvVar(name)
  return process.env[skipEnvVar] === '1' || process.env[skipEnvVar] === 'true'
}

// Cache for DDEV detection to avoid repeated filesystem checks
let _ddevProjectCache: boolean | null = null

/**
 * Check if the current project is a DDEV project
 * Result is cached after first call for performance.
 * @returns True if .ddev/config.yaml exists and ddev binary is available
 */
export async function isDdevProject(): Promise<boolean> {
  // Return cached result if available
  if (_ddevProjectCache !== null) {
    return _ddevProjectCache
  }

  // Allow explicit disable via env var
  if (process.env.DDEV_PHP === 'false' || process.env.DDEV_PHP === '0') {
    _ddevProjectCache = false
    return false
  }

  const hasConfig = await fs.pathExists('.ddev/config.yaml')
  if (!hasConfig) {
    _ddevProjectCache = false
    return false
  }

  try {
    await which('ddev')
    _ddevProjectCache = true
    return true
  } catch {
    _ddevProjectCache = false
    return false
  }
}

/**
 * Reset DDEV detection cache (useful for testing)
 */
export function resetDdevCache(): void {
  _ddevProjectCache = null
}

/**
 * Get the DDEV project name from .ddev/config.yaml
 * @returns The project name
 * @throws Error if config cannot be read or parsed
 */
async function getDdevProjectName(): Promise<string> {
  const configPath = '.ddev/config.yaml'
  
  try {
    const configContent = await fs.readFile(configPath, 'utf-8')
    const match = configContent.match(/^name:\s*(.+)$/m)
    
    if (!match) {
      throw new Error(
        `Could not find "name:" field in ${configPath}. ` +
        'Ensure the file contains a valid "name: your-project-name" entry.'
      )
    }
    
    const projectName = match[1].trim()
    if (!projectName) {
      throw new Error(
        `Empty project name in ${configPath}. ` +
        'The "name:" field must have a non-empty value.'
      )
    }
    
    return projectName
  } catch (error) {
    if (error instanceof Error && error.message.includes(configPath)) {
      // Re-throw our custom errors
      throw error
    }
    // File read error
    throw new Error(
      `Failed to read DDEV config at ${configPath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Get the command to execute, wrapping in ddev exec if necessary
 * @param command The command parts (e.g. ['php', '-v'])
 * @param type The tool type ('node', 'php', 'system')
 * @returns The modified command array ready for execution
 */
async function getExecCommand(command: string[], type: string): Promise<string[]> {
  if (type !== 'php') {
    return command
  }

  if (!(await isDdevProject())) {
    return command
  }

  // getDdevProjectName() throws with specific error if config is invalid
  const projectName = await getDdevProjectName()

  // Since isDdevProject() confirms we are at the project root (where .ddev exists),
  // we map directly to the container's web root.
  const containerPath = '/var/www/html'

  // Determine User ID
  // On Linux and macOS, we use the host UID so file permissions match.
  // On Windows, DDEV handles permissions via filesystem mounts, so we use default 1000.
  let uid = 1000
  let gid = 1000

  if (process.platform !== 'win32') {
    uid = process.getuid ? process.getuid() : 1000
    gid = process.getgid ? process.getgid() : 1000
  }

  const containerName = `ddev-${projectName}-web`

  return [
    'docker',
    'exec',
    '-t', // Allocate pseudo-TTY
    '-u',
    `${uid}:${gid}`,
    '-w',
    containerPath,
    containerName,
    ...command,
  ]
}

/**
 * Ensure Mutagen sync is complete if enabled
 */
export async function ensureMutagenSync(): Promise<void> {
  if (await isDdevProject()) {
    try {
      // Attempt to sync mutagen. This will fail if mutagen is not enabled, which is fine.
      // We use 'ddev mutagen sync' which forces a sync.
      await exec(['ddev', 'mutagen', 'sync'], { quiet: true })
    } catch {
      // Ignore errors (e.g. mutagen not enabled)
    }
  }
}
