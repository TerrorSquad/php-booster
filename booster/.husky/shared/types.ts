/**
 * Type of tool environment
 * - 'node': Tool is located in node_modules/.bin/
 * - 'php': Tool is located in vendor/bin/
 * - 'system': Tool is located in the system PATH
 */
export type ToolType = 'node' | 'php' | 'system'

/**
 * Failure mode for a tool
 * - 'continue': Log error, keep running other tools, report failure at end
 * - 'stop': Log error, skip remaining tools, report failure immediately
 */
export type FailureMode = 'continue' | 'stop'

/**
 * Configuration for a quality tool
 */
export interface ToolConfig {
  /** Display name of the tool (used in logs) */
  name: string
  /** The binary command to run (e.g., 'eslint', 'rector') */
  command: string
  /** Arguments to pass to the command */
  args?: string[]
  /** Determines where to look for the binary */
  type: ToolType
  /** Only run on files with these extensions (e.g., ['.ts', '.js']) */
  extensions?: string[]
  /** If true, re-stages files after execution (useful for fixers) */
  stagesFilesAfter?: boolean
  /** If false, does not pass the list of staged files to the command. Default is true. */
  passFiles?: boolean
  /** If true, runs the command for each file individually. Default is false. */
  runForEachFile?: boolean
  /** Custom description to show in logs while running */
  description?: string
  /**
   * What happens when this tool fails. Default is 'continue'.
   * - 'continue': Log error, keep running other tools
   * - 'stop': Log error, skip remaining tools (use for syntax checks that must pass first)
   */
  onFailure?: FailureMode
  /**
   * Optional group name for parallel execution.
   * Tools with the same parallelGroup value will run concurrently.
   * Tools without a parallelGroup run sequentially in order.
   * Output is buffered and printed after all parallel tools complete.
   */
  parallelGroup?: string
}

/**
 * Result of running a single tool (used for parallel execution)
 */
export interface ToolResult {
  /** Tool name */
  name: string
  /** Whether the tool succeeded */
  success: boolean
  /** Buffered output (stdout + stderr) */
  output: string
  /** Execution duration in ms */
  duration: number
  /** Files that need to be staged after (if any) */
  filesToStage?: string[]
}

/**
 * Supported Git hooks
 */
export const GitHook = {
  PreCommit: 'pre-commit',
  PrePush: 'pre-push',
  CommitMsg: 'commit-msg',
} as const

export type GitHook = (typeof GitHook)[keyof typeof GitHook]

/**
 * Tool override configuration (partial ToolConfig for customization)
 */
export interface ToolOverride {
  /** Set to false to disable this tool */
  enabled?: boolean
  /** Override arguments */
  args?: string[]
  /** Override extensions */
  extensions?: string[]
  /** Override failure mode */
  onFailure?: FailureMode
  /** Override parallel group */
  parallelGroup?: string
  /** Override description */
  description?: string
}

/**
 * Custom tool definition (for adding new tools via config)
 */
export interface CustomToolConfig extends Omit<ToolConfig, 'name'> {
  /** Set to false to disable this tool */
  enabled?: boolean
}

/**
 * Git hooks configuration file schema (.git-hooks.config.json)
 */
export interface HooksConfig {
  /**
   * Tool overrides - key is tool name (e.g., "PHPStan", "ESLint")
   * Use existing tool names to override, or new names to add custom tools
   */
  tools?: Record<string, ToolOverride | CustomToolConfig>
  /**
   * Enable verbose logging (same as GIT_HOOKS_VERBOSE=1)
   */
  verbose?: boolean
  /**
   * Skip specific hooks or features entirely
   */
  skip?: {
    /** Skip entire pre-commit hook */
    preCommit?: boolean
    /** Skip entire pre-push hook */
    prePush?: boolean
    /** Skip entire commit-msg hook */
    commitMsg?: boolean
    /** Skip tests in pre-push (Pest/PHPUnit) */
    tests?: boolean
    /** Skip artifact generation in pre-push */
    artifacts?: boolean
  }
}
