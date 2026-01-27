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
import { GitHook, type ToolConfig, type ToolResult } from './types.ts'

const HOOK_ENV_MAPPING: Record<GitHook, string> = {
  [GitHook.PreCommit]: 'PRECOMMIT',
  [GitHook.PrePush]: 'PREPUSH',
  [GitHook.CommitMsg]: 'COMMITMSG',
}

/**
 * Extract meaningful error details from a command failure
 * Parses stderr/stdout to find file paths, line numbers, and error messages
 */
function extractErrorDetails(error: unknown): string {
  // zx ProcessOutput errors have stdout/stderr properties
  const processError = error as { stdout?: string; stderr?: string; message?: string }
  
  // Combine all available output
  const output = [
    processError.stderr,
    processError.stdout,
    processError.message,
    error instanceof Error ? error.message : String(error)
  ].filter(Boolean).join('\n')

  // Try to extract PHP-style errors: "in /path/file.php on line N"
  const phpErrorMatch = output.match(/(?:Parse error|Fatal error|syntax error)[^]*?in\s+(\S+)\s+on\s+line\s+(\d+)/i)
  if (phpErrorMatch) {
    const [fullMatch] = phpErrorMatch
    // Clean up and return the meaningful part
    return fullMatch.trim()
  }

  // Try to extract generic "file:line" patterns (ESLint, TypeScript, etc.)
  const fileLineMatch = output.match(/([^\s:]+\.[a-z]+):(\d+)(?::(\d+))?[:\s]+(.+)/i)
  if (fileLineMatch) {
    const [, file, line, col, message] = fileLineMatch
    return col 
      ? `${file}:${line}:${col} - ${message.trim()}`
      : `${file}:${line} - ${message.trim()}`
  }

  // Return first non-empty line of output (most tools put the error first)
  const firstLine = output.split('\n').find(line => line.trim())
  if (firstLine && firstLine.length < 200) {
    return firstLine.trim()
  }

  // Fallback to generic message
  return error instanceof Error ? error.message : String(error)
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
    const errorDetails = extractErrorDetails(error)
    log.error(`${toolName} failed after ${formattedDuration}`)
    log.error(`  → ${errorDetails}`)

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
 * Execute a tool command (streaming output)
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
 * Execute a tool with buffered output (for parallel execution)
 * Captures all output and returns it instead of streaming
 */
async function execToolBuffered(tool: ToolConfig, files: string[]): Promise<string> {
  const args = [...(tool.args || [])]
  const command = resolveCommandPath(tool)
  const outputs: string[] = []

  const runCommand = async (cmdArgs: string[]): Promise<string> => {
    const finalCommand = await getBufferedCommand(command, cmdArgs, tool.type)
    const result = await $({ stdio: 'pipe' })`${finalCommand}`
    return result.stdout + result.stderr
  }

  if (tool.runForEachFile) {
    const concurrency = 10
    const chunks = []
    for (let i = 0; i < files.length; i += concurrency) {
      chunks.push(files.slice(i, i + concurrency))
    }

    for (const chunk of chunks) {
      const chunkOutputs = await Promise.all(chunk.map((file) => runCommand([...args, file])))
      outputs.push(...chunkOutputs)
    }
  } else {
    const cmdArgs = [...args]
    if (tool.passFiles !== false) {
      cmdArgs.push(...files)
    }
    outputs.push(await runCommand(cmdArgs))
  }

  return outputs.filter(Boolean).join('\n')
}

/**
 * Build command for buffered execution (handles DDEV wrapping)
 */
async function getBufferedCommand(
  command: string,
  args: string[],
  type: string,
): Promise<string[]> {
  if (type !== 'php' || !(await isDdevProject())) {
    return [command, ...args]
  }

  // Wrap in ddev exec for PHP tools
  return ['ddev', 'exec', command, ...args]
}

/**
 * Prepared tool ready to run (after skip/availability checks)
 */
interface PreparedTool {
  tool: ToolConfig
  files: string[]
  description: string
}

/**
 * Prepare a tool for execution (check skips, filter files, check availability)
 * Returns null if tool should be skipped
 */
async function prepareTool(tool: ToolConfig, files: string[]): Promise<PreparedTool | null> {
  // Check if tool is explicitly skipped via env var
  if (isSkipped(tool.name)) {
    log.skip(`${tool.name} skipped (SKIP_${tool.name.toUpperCase()} environment variable set)`)
    return null
  }

  // Filter files based on tool extensions if specified
  const filesToRun = tool.extensions
    ? files.filter((file) => tool.extensions!.some((ext) => file.endsWith(ext)))
    : files

  if (filesToRun.length === 0) return null

  // Check binary existence
  if (!(await isToolAvailable(tool))) {
    log.skip(`${tool.name} not found at ${tool.command}. Skipping...`)
    return null
  }

  return {
    tool,
    files: filesToRun,
    description: tool.description || `Running ${tool.name}...`,
  }
}

/**
 * Run a single tool and return result (for parallel execution)
 */
async function runToolBuffered(prepared: PreparedTool): Promise<ToolResult> {
  const { tool, files, description } = prepared
  const startTime = Date.now()

  try {
    log.tool(tool.name, description)
    const output = await execToolBuffered(tool, files)
    const duration = Date.now() - startTime

    return {
      name: tool.name,
      success: true,
      output,
      duration,
      filesToStage: tool.stagesFilesAfter && tool.passFiles !== false ? files : undefined,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorDetails = extractErrorDetails(error)

    return {
      name: tool.name,
      success: false,
      output: errorDetails,
      duration,
    }
  }
}

/**
 * Print results from parallel tool execution
 */
function printParallelResults(results: ToolResult[]): void {
  for (const result of results) {
    const formattedDuration = formatDuration(result.duration)

    if (result.success) {
      log.success(`${result.name} completed successfully (${formattedDuration})`)
    } else {
      log.error(`${result.name} failed after ${formattedDuration}`)
      log.error(`  → ${result.output}`)
    }
  }
}

/**
 * Group tools by their parallelGroup property
 * Tools without a group get their own single-item group
 */
function groupToolsByParallel(tools: ToolConfig[]): ToolConfig[][] {
  const groups: ToolConfig[][] = []
  let currentGroup: ToolConfig[] = []
  let currentGroupName: string | undefined

  for (const tool of tools) {
    if (tool.parallelGroup) {
      // Tool has a parallel group
      if (currentGroupName === tool.parallelGroup) {
        // Same group, add to current
        currentGroup.push(tool)
      } else {
        // Different group, flush current and start new
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
        }
        currentGroup = [tool]
        currentGroupName = tool.parallelGroup
      }
    } else {
      // No parallel group - flush any pending group and add as single-item group
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
        currentGroup = []
        currentGroupName = undefined
      }
      groups.push([tool])
    }
  }

  // Flush remaining group
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

/**
 * Run all configured quality tools on the provided files
 *
 * Iterates through the provided tools and:
 * 1. Checks if the tool should run (not skipped, binary exists)
 * 2. Filters files based on tool extensions
 * 3. Runs the tool command (parallel for tools with same parallelGroup)
 * 4. Stages files if configured (for fixers)
 *
 * @param files List of staged files to check
 * @param tools List of tool configurations to run
 * @returns true if all tools passed, false otherwise
 */
export async function runQualityChecks(files: string[], tools: ToolConfig[]): Promise<boolean> {
  let allSuccessful = true
  const toolGroups = groupToolsByParallel(tools)

  for (const group of toolGroups) {
    // Prepare all tools in the group
    const preparedTools = await Promise.all(group.map((tool) => prepareTool(tool, files)))
    const runnableTools = preparedTools.filter((p): p is PreparedTool => p !== null)

    if (runnableTools.length === 0) continue

    if (runnableTools.length === 1) {
      // Single tool - run with streaming output (better UX)
      const { tool, files: filesToRun, description } = runnableTools[0]

      const success = await runStep(tool.name, description, () => execTool(tool, filesToRun))

      if (success && tool.stagesFilesAfter && tool.passFiles !== false) {
        await ensureMutagenSync()
        await stageFiles(filesToRun)
      }

      if (!success) {
        allSuccessful = false
        if (tool.onFailure === 'stop') {
          log.error(`${tool.name} failed. Stopping subsequent checks.`)
          return false
        }
      }
    } else {
      // Multiple tools - run in parallel with buffered output
      log.info(`Running ${runnableTools.length} tools in parallel: ${runnableTools.map((t) => t.tool.name).join(', ')}`)

      const results = await Promise.all(runnableTools.map(runToolBuffered))

      // Print results in order
      printParallelResults(results)

      // Stage files for successful tools that need it
      for (const result of results) {
        if (result.success && result.filesToStage) {
          await ensureMutagenSync()
          await stageFiles(result.filesToStage)
        }
      }

      // Check for failures
      const failed = results.filter((r) => !r.success)
      if (failed.length > 0) {
        allSuccessful = false

        // Check if any failed tool has onFailure: 'stop'
        for (const result of failed) {
          const tool = group.find((t) => t.name === result.name)
          if (tool?.onFailure === 'stop') {
            log.error(`${result.name} failed. Stopping subsequent checks.`)
            return false
          }
        }
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
