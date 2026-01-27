import { $, which, fs } from 'zx'
import {
  ensureMutagenSync,
  exec,
  formatDuration,
  initEnvironment,
  isDdevProject,
  isSkipped,
  log,
} from './core.ts'
import { shouldSkipDuringMerge, stageFiles } from './git.ts'
import { GitHook, type ToolConfig } from './types.ts'

const HOOK_ENV_MAPPING: Record<GitHook, string> = {
  [GitHook.PreCommit]: 'PRECOMMIT',
  [GitHook.PrePush]: 'PREPUSH',
  [GitHook.CommitMsg]: 'COMMITMSG',
}

/**
 * Run a tool with consistent error handling, logging, and performance monitoring
 * @param toolName Name of the tool being run
 * @param action Action being performed (e.g., 'Running static analysis...', 'Running code style fixes...')
 * @param fn Function that executes the tool
 */
export async function runStep(
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
  } catch (error) {
    const duration = Date.now() - startTime
    const formattedDuration = formatDuration(duration)
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error(`${toolName} failed after ${formattedDuration}: ${errorMessage}`)

    return false
  }
}

/**
 * Resolve the full path to a tool command based on its type
 */
function resolveCommandPath(tool: ToolConfig): string {
  // Don't modify absolute paths or paths starting with ./
  if (tool.command.startsWith('/') || tool.command.startsWith('./')) {
    return tool.command
  }

  // If the command already contains a path separator, assume it's a relative path
  // (e.g. "bin/console" or "vendor/bin/rector") and don't modify it
  if (tool.command.includes('/')) {
    return tool.command
  }

  // Don't modify standard system commands
  if (['php', 'composer', 'git', 'npm', 'pnpm', 'yarn', 'node'].includes(tool.command)) {
    return tool.command
  }

  if (tool.type === 'php') {
    return `vendor/bin/${tool.command}`
  }

  if (tool.type === 'node') {
    return `node_modules/.bin/${tool.command}`
  }

  return tool.command
}

/**
 * Check if a tool is available to run
 */
async function isToolAvailable(tool: ToolConfig): Promise<boolean> {
  const commandPath = resolveCommandPath(tool)

  if (tool.type === 'php' && (await isDdevProject())) {
    // For standard PHP tools (php, composer), assume they exist in the container
    if (tool.command === 'php' || tool.command === 'composer') {
      return true
    }
    // For other tools (phpstan, ecs, rector), check if they exist
    // This prevents trying to run tools that aren't installed
    return await fs.pathExists(commandPath)
  }

  // For node tools or system tools, check if the command exists as a file
  // (e.g. node_modules/.bin/eslint)
  if (await fs.pathExists(commandPath)) {
    return true
  }

  // Fallback to checking PATH (for system tools like git)
  return await which(tool.command)
    .then(() => true)
    .catch(() => false)
}

/**
 * Execute a tool command
 */
async function execTool(tool: ToolConfig, files: string[]): Promise<void> {
  const args = [...(tool.args || [])]
  const command = resolveCommandPath(tool)

  if (tool.runForEachFile) {
    // Run command for each file individually with concurrency limit
    const concurrency = 10
    const chunks = []
    for (let i = 0; i < files.length; i += concurrency) {
      chunks.push(files.slice(i, i + concurrency))
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((file) =>
          exec([command, ...args, file], {
            quiet: true,
            type: tool.type,
          }),
        ),
      )
    }
  } else {
    // Run command once with all files
    const cmdArgs = [...args]
    if (tool.passFiles !== false) {
      cmdArgs.push(...files)
    }
    await exec([command, ...cmdArgs], { type: tool.type })
  }
}

/**
 * Run all configured quality tools on the provided files
 *
 * Iterates through the provided tools and:
 * 1. Checks if the tool should run (not skipped, binary exists)
 * 2. Filters files based on tool extensions
 * 3. Runs the tool command
 * 4. Stages files if configured (for fixers)
 *
 * @param files List of staged files to check
 * @param tools List of tool configurations to run
 * @returns true if all tools passed, false otherwise
 */
export async function runQualityChecks(files: string[], tools: ToolConfig[]): Promise<boolean> {
  let allSuccessful = true

  for (const tool of tools) {
    // Check if tool is explicitly skipped via env var
    if (isSkipped(tool.name)) {
      log.skip(`${tool.name} skipped (SKIP_${tool.name.toUpperCase()} environment variable set)`)
      continue
    }

    // Filter files based on tool extensions if specified
    const filesToRun = tool.extensions
      ? files.filter((file) => tool.extensions!.some((ext) => file.endsWith(ext)))
      : files

    if (filesToRun.length === 0) continue

    // Check binary existence
    if (!(await isToolAvailable(tool))) {
      log.skip(`${tool.name} not found at ${tool.command}. Skipping...`)
      continue
    }

    const description = tool.description || `Running ${tool.name}...`

    const success = await runStep(tool.name, description, () => execTool(tool, filesToRun))

    if (success && tool.stagesFilesAfter && tool.passFiles !== false) {
      // Ensure any changes made in the container are synced back to host before staging
      await ensureMutagenSync()
      await stageFiles(filesToRun)
    }

    if (!success) {
      allSuccessful = false

      // Check failure mode - 'stop' halts execution, 'continue' (default) keeps going
      if (tool.onFailure === 'stop') {
        log.error(`${tool.name} failed. Stopping subsequent checks.`)
        return false
      }
    }
  }

  return allSuccessful
}

/**
 * Standardized hook execution wrapper
 * Handles environment setup, error catching, and performance reporting
 */
export async function runHook(hookName: GitHook, fn: () => Promise<boolean>): Promise<void> {
  // Fix locale issues that can occur in VS Code
  process.env.LC_ALL = 'C'
  process.env.LANG = 'C'

  try {
    await initEnvironment()

    // Configure zx verbose mode based on environment
    $.verbose = process.env.GIT_HOOKS_VERBOSE === '1' || process.env.GIT_HOOKS_VERBOSE === 'true'

    const startTime = Date.now()
    log.step(`Starting ${hookName} checks...`)

    // Check if we should skip the entire hook
    const skipVar = HOOK_ENV_MAPPING[hookName]
    if (isSkipped(skipVar)) {
      log.info(`Skipping ${hookName} checks (SKIP_${skipVar} environment variable set)`)
      process.exit(0)
    }

    // Check if we should skip all checks during merge
    if (await shouldSkipDuringMerge()) {
      log.info(`Skipping ${hookName} checks during merge`)
      process.exit(0)
    }

    const success = await fn()

    const totalDuration = Date.now() - startTime
    const formattedTotalDuration = formatDuration(totalDuration)

    if (success) {
      log.celebrate(`All ${hookName} checks passed! (Total time: ${formattedTotalDuration})`)
    } else {
      log.error(
        `Some ${hookName} checks failed after ${formattedTotalDuration}. Please fix the issues and try again.`,
      )
      process.exit(1)
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error(`Unexpected error: ${errorMessage}`)
    process.exit(1)
  }
}
