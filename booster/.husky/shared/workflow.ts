import { $, which } from 'zx'
import { formatDuration, initEnvironment, isSkipped, log, runWithRunner } from './core.ts'
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
  } catch {
    const duration = Date.now() - startTime
    const formattedDuration = formatDuration(duration)
    log.error(`${toolName} failed after ${formattedDuration}`)

    return false
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
export async function runQualityTools(files: string[], tools: ToolConfig[]): Promise<boolean> {
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
    const exists = await which(tool.command)
      .then(() => true)
      .catch(() => false)

    if (!exists) {
      log.skip(`${tool.name} not found at ${tool.command}. Skipping...`)
      continue
    }

    // Prepare arguments
    const args = [...(tool.args || [])]

    const description = tool.description || `Running ${tool.name}...`

    const success = await runTool(tool.name, description, async () => {
      if (tool.runForEachFile) {
        // Run command for each file individually with concurrency limit
        const concurrency = 10
        const chunks = []
        for (let i = 0; i < filesToRun.length; i += concurrency) {
          chunks.push(filesToRun.slice(i, i + concurrency))
        }

        for (const chunk of chunks) {
          await Promise.all(
            chunk.map((file) => runWithRunner([tool.command, ...args, file], { quiet: true })),
          )
        }
      } else {
        // Run command once with all files
        if (tool.passFiles !== false) {
          args.push(...filesToRun)
        }
        await runWithRunner([tool.command, ...args])
      }
    })

    if (success && tool.stagesFilesAfter && tool.passFiles !== false) {
      await stageFiles(filesToRun)
    }

    if (!success) {
      allSuccessful = false
      if (tool.required) {
        log.error(`${tool.name} is required but failed`)
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
