/**
 * Type of tool environment
 * - 'node': Tool is located in node_modules/.bin/
 * - 'php': Tool is located in vendor/bin/
 * - 'system': Tool is located in the system PATH
 */
export type ToolType = 'node' | 'php' | 'system'

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
  /** If true, the hook will fail if this tool fails. Default is false (but usually the hook fails if any tool fails). */
  required?: boolean
  /** If true, stops running subsequent tools if this tool fails. Useful for syntax checks that must pass before analysis. */
  blocking?: boolean
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
