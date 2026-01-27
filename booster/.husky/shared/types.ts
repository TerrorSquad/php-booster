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
