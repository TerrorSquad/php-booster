#!/usr/bin/env zx

/**
 * Commit-msg hook - ZX implementation
 *
 * Validates commit messages and branch names:
 * - Branch name validation using validate-branch-name
 * - Commit message linting with commitlint
 * - Automatic ticket footer appending when required
 */

import { $, fs, path } from 'zx'
import {
  log,
  shouldSkipChecks,
  runTool,
  runWithRunner
} from '../shared/utils.mjs'

// Configure zx
$.verbose = false

/**
 * Load and parse validate-branch-name configuration
 */
async function loadConfig() {
  const configPath = path.resolve('./validate-branch-name.config.cjs')

  if (!(await fs.pathExists(configPath))) {
    throw new Error(`Configuration file not found: ${configPath}`)
  }

  try {
    const content = await fs.readFile(configPath, 'utf8')

    // Extract the config object from the CommonJS module
    const configMatch = content.match(/const config = ({.*?});/s)
    if (!configMatch) {
      throw new Error('Could not find config object in config file')
    }

    const configStr = configMatch[1]

    // Safely evaluate the JavaScript object
    const config = eval(`(${configStr})`)

    // Validate required properties and apply defaults
    return {
      types: Array.isArray(config.types) ? config.types : [],
      ticketIdPrefix: config.ticketIdPrefix || null,
      ticketNumberPattern: config.ticketNumberPattern || null,
      commitFooterLabel: config.commitFooterLabel || 'Closes',
      requireTickets: Boolean(config.requireTickets),
      skipped: Array.isArray(config.skipped) ? config.skipped : [],
      namePattern: config.namePattern || null
    }
  } catch (error) {
    throw new Error(`Failed to load branch validation config: ${error.message}`)
  }
}

/**
 * Check if the current branch should skip validation
 */
function isBranchSkipped(branchName, config) {
  const skipped = config.skipped || []
  return skipped.includes(branchName)
}

/**
 * Process configuration and determine ticket requirements
 */
function processConfig(config) {
  // Use explicit requireTickets flag, but validate that patterns exist if tickets are required
  const needTicket = config.requireTickets && !!(config.ticketIdPrefix && config.ticketNumberPattern)
  console.log('Need ticket:', needTicket)
  console.log('Ticket ID Prefix:', config.ticketIdPrefix)
  console.log('Ticket Number Pattern:', config.ticketNumberPattern)
  console.log('config.requireTickets:', config.requireTickets)

  let footerLabel = String(config.commitFooterLabel || 'Closes').trim()

  // Sanitize footer label - must be valid identifier, no special chars
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(footerLabel) || footerLabel.includes('=') || footerLabel.includes('\n')) {
    footerLabel = 'Closes'
  }

  return {
    needTicket,
    footerLabel,
    config
  }
}

/**
 * Extract ticket ID from branch name
 */
function extractTicketId(branchName, config) {
  if (!config.ticketIdPrefix || !config.ticketNumberPattern) {
    return null
  }

  try {
    // Create regex pattern: ((?:PREFIX)-PATTERN)
    const ticketRegex = new RegExp(`((?:${config.ticketIdPrefix})-${config.ticketNumberPattern})`, 'i')
    const match = branchName.match(ticketRegex)
    return match ? match[1] : null
  } catch (error) {
    log.error(`Ticket regex error: ${error.message}`)
    return null
  }
}

/**
 * Check if node_modules exists and has required binaries
 */
async function checkDependencies() {
  const nodeModulesExists = await fs.pathExists('./node_modules')
  if (!nodeModulesExists) {
    log.error('node_modules not found. Run npm/pnpm install.')
    process.exit(1)
  }

  const commitlintExists = await fs.pathExists('./node_modules/.bin/commitlint')
  const validateBranchExists = await fs.pathExists('./node_modules/.bin/validate-branch-name')

  if (!commitlintExists) {
    log.error('commitlint not found in node_modules/.bin/')
    process.exit(1)
  }

  if (!validateBranchExists) {
    log.error('validate-branch-name not found in node_modules/.bin/')
    process.exit(1)
  }
}

/**
 * Get current branch name
 */
async function getCurrentBranch() {
  try {
    const result = await $`git rev-parse --abbrev-ref HEAD`
    return result.toString().trim()
  } catch (error) {
    log.error('Failed to get current branch name')
    process.exit(1)
  }
}

/**
 * Validate branch name using validate-branch-name tool
 */
async function validateBranchName(branchName) {
  try {
    // Try quiet validation first
    await runWithRunner(['./node_modules/.bin/validate-branch-name', '-t', branchName], { quiet: true, showCommand: false })
    log.success('Branch name validation passed')
    return true
  } catch (error) {
    // Show detailed error
    log.error('Branch name validation failed')
    try {
      await runWithRunner(['./node_modules/.bin/validate-branch-name', '-t', branchName], { showCommand: false })
    } catch (detailedError) {
      // Error output will be shown by runWithRunner
    }
    log.info('See rules in validate-branch-name.config.cjs')
    return false
  }
}

/**
 * Lint commit message using commitlint
 */
async function lintCommitMessage(commitFile) {
  return await runTool('Commitlint', async () => {
    log.tool('Commitlint', 'Validating commit message format...')
    await runWithRunner(['./node_modules/.bin/commitlint', '--edit', commitFile])
    log.success('Commit message validation passed')
  })
}

/**
 * Append ticket footer to commit message if needed
 */
async function appendTicketFooter(commitFile) {
  // Load and process configuration
  const config = await loadConfig()
  const branchName = await getCurrentBranch()

  // Check if current branch is skipped (exempt from all validation)
  if (isBranchSkipped(branchName, config)) {
    log.info(`Branch '${branchName}' is skipped - no ticket requirements`)
    return
  }

  const { needTicket, footerLabel } = processConfig(config)

  if (!needTicket) {
    log.info('Ticket footer not required')
    return
  }

  const ticketId = extractTicketId(branchName, config)

  if (!ticketId) {
    log.error('No ticket ID found in branch name, but ticket is required')
    process.exit(1)
  }

  // Read current commit message
  const commitContent = await fs.readFile(commitFile, 'utf8')
  const lines = commitContent.split('\n')

  // Get commit body (everything after first line, excluding comments)
  const commitBody = lines.slice(1)
    .filter(line => !line.startsWith('#'))
    .join('\n')

  // Check if ticket ID is already in the commit body
  if (commitBody.includes(ticketId)) {
    log.info(`Ticket ID ${ticketId} already present in commit message`)
    return
  }

  // Append ticket footer
  const footer = `\n${footerLabel}: ${ticketId}\n`
  await fs.appendFile(commitFile, footer)

  log.success(`Added ticket footer: ${footerLabel}: ${ticketId}`)
}

async function main() {
  const [commitFile] = process.argv.slice(3) // Skip node, script, and hook args

  if (!commitFile) {
    log.error('No commit file provided')
    process.exit(1)
  }

  log.step('Starting commit-msg validation...')

  // Check if we should skip all checks
  if (await shouldSkipChecks()) {
    process.exit(0)
  }

  // Check dependencies
  await checkDependencies()

  // Get current branch for validation
  const branchName = await getCurrentBranch()
  log.info(`Current branch: ${branchName}`)

  // 1. Validate branch name
  if (!(await validateBranchName(branchName))) {
    process.exit(1)
  }

  // 2. Lint commit message
  if (!(await lintCommitMessage(commitFile))) {
    process.exit(1)
  }

  // 3. Append ticket footer if needed
  await appendTicketFooter(commitFile)

  log.celebrate('All commit-msg checks passed!')
}

// Run main function
try {
  await main()
} catch (error) {
  log.error(`Unexpected error: ${error.message}`)
  process.exit(1)
}
