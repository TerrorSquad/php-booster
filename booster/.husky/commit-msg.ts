#!/usr/bin/env zx

/**
 * Commit-msg hook - ZX TypeScript implementation
 *
 * Validates commit messages and branch names:
 * - Branch name validation using validate-branch-name
 * - Commit message linting with commitlint
 * - Automatic ticket footer appending when required
 *
 * Environment Variables:
 * - SKIP_COMMITMSG=1: Skip the entire commit-msg hook
 * - GIT_HOOKS_VERBOSE=1: Enable verbose output for debugging
 */
import { fs, path } from 'zx'
import { fileURLToPath } from 'url'
import validateBranchNameConfig from '../validate-branch-name.config.cjs'
import { getCurrentBranch, GitHook, log, runHook, runTool, runWithRunner } from './shared/index.ts'

/**
 * Branch validation configuration interface
 */
interface BranchConfig {
  types: string[]
  ticketIdPrefix: string | null
  ticketNumberPattern: string | null
  commitFooterLabel: string
  requireTickets: boolean
  skipped: string[]
  namePattern: string | null
}

/**
 * Processed configuration interface
 */
interface ProcessedConfig {
  needTicket: boolean
  footerLabel: string
  config: BranchConfig
}

/**
 * Load and parse validate-branch-name configuration
 */
function loadConfig(): BranchConfig {
  const config = validateBranchNameConfig.config

  // Validate required properties and apply defaults
  return {
    types: Array.isArray(config.types) ? config.types : [],
    ticketIdPrefix: config.ticketIdPrefix || null,
    ticketNumberPattern: config.ticketNumberPattern || null,
    commitFooterLabel: config.commitFooterLabel || 'Closes',
    requireTickets: Boolean(config.requireTickets),
    skipped: Array.isArray(config.skipped) ? config.skipped : [],
    namePattern: config.namePattern || null,
  }
}

/**
 * Check if the current branch should skip validation
 */
function isBranchSkipped(branchName: string, config: BranchConfig): boolean {
  const skipped = config.skipped || []
  return skipped.includes(branchName)
}

/**
 * Process configuration and determine ticket requirements
 */
function processConfig(config: BranchConfig): ProcessedConfig {
  // Use explicit requireTickets flag, but validate that patterns exist if tickets are required
  const needTicket =
    config.requireTickets && !!(config.ticketIdPrefix && config.ticketNumberPattern)

  let footerLabel = String(config.commitFooterLabel || 'Closes').trim()

  // Sanitize footer label - must be valid identifier, no special chars
  if (
    !/^[A-Za-z][A-Za-z0-9_-]*$/.test(footerLabel) ||
    footerLabel.includes('=') ||
    footerLabel.includes('\n')
  ) {
    footerLabel = 'Closes'
  }

  return {
    needTicket,
    footerLabel,
    config,
  }
}

/**
 * Extract ticket ID from branch name
 */
function extractTicketId(branchName: string, config: BranchConfig): string | null {
  if (!config.ticketIdPrefix || !config.ticketNumberPattern) {
    return null
  }

  try {
    // Create regex pattern: ((?:PREFIX)-PATTERN)
    const ticketRegex = new RegExp(
      `((?:${config.ticketIdPrefix})-${config.ticketNumberPattern})`,
      'i',
    )
    const match = branchName.match(ticketRegex)
    return match ? match[1] : null
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error(`Ticket regex error: ${errorMessage}`)
    return null
  }
}

/**
 * Validate branch name using validate-branch-name tool
 */
async function validateBranchName(branchName: string): Promise<boolean> {
  const binPath = 'validate-branch-name'

  return await runTool('Branch Name', 'Validating branch name...', async () => {
    try {
      // Try quiet validation first
      await runWithRunner([binPath, '-t', branchName], {
        quiet: true,
      })
    } catch {
      // If failed, run again without quiet to show error
      log.error('Branch name validation failed')
      try {
        await runWithRunner([binPath, '-t', branchName])
      } catch {
        // Error output will be shown by runWithRunner
      }
      log.info('See rules in validate-branch-name.config.cjs')
      throw new Error('Branch name validation failed')
    }
  })
}

/**
 * Lint commit message using commitlint
 */
async function lintCommitMessage(commitFile: string): Promise<boolean> {
  const binPath = 'commitlint'

  const __filename = fileURLToPath(import.meta.url)
  const scriptDir = path.dirname(__filename)
  const configPath = path.resolve(scriptDir, '../commitlint.config.ts')

  return await runTool('Commitlint', 'Validating commit message format...', async () => {
    await runWithRunner([binPath, '--config', configPath, '--edit', commitFile])
  })
}

/**
 * Append ticket footer to commit message if needed
 */
async function appendTicketFooter(commitFile: string): Promise<boolean> {
  try {
    // Load and process configuration
    const config = loadConfig()
    const branchName = await getCurrentBranch()

    // Check if current branch is skipped (exempt from all validation)
    if (isBranchSkipped(branchName, config)) {
      log.info(`Branch '${branchName}' is skipped - no ticket requirements`)
      return true
    }

    const { needTicket, footerLabel } = processConfig(config)

    if (!needTicket) {
      return true
    }

    const ticketId = extractTicketId(branchName, config)

    if (!ticketId) {
      log.error('No ticket ID found in branch name, but ticket is required')
      return false
    }

    // Read current commit message
    const commitContent = await fs.readFile(commitFile, 'utf8')
    const lines = commitContent.split('\n')

    // Get commit body (everything after first line, excluding comments)
    const commitBody = lines
      .slice(1)
      .filter((line: string) => !line.startsWith('#'))
      .join('\n')

    // Check if ticket ID is already in the commit body
    if (commitBody.includes(ticketId)) {
      log.info(`Ticket ID ${ticketId} already present in commit message`)
      return true
    }

    // Append ticket footer
    const footer = `\n${footerLabel}: ${ticketId}\n`
    await fs.appendFile(commitFile, footer)

    log.success(`Added ticket footer: ${footerLabel}: ${ticketId}`)
    return true
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error(`Failed to append ticket footer: ${errorMessage}`)
    return false
  }
}
await runHook(GitHook.CommitMsg, async () => {
  const [commitFile] = process.argv.slice(3) // Skip node, script, and hook args

  if (!commitFile) {
    log.error('No commit file provided')
    return false
  }

  // Get current branch for validation
  const branchName = await getCurrentBranch()
  log.info(`Current branch: ${branchName}`)

  // 1. Validate branch name
  if (!(await validateBranchName(branchName))) {
    return false
  }

  // 2. Lint commit message
  if (!(await lintCommitMessage(commitFile))) {
    return false
  }

  // 3. Append ticket footer if needed
  if (!(await appendTicketFooter(commitFile))) {
    return false
  }

  return true
})
