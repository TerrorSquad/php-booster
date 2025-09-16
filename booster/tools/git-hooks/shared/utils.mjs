#!/usr/bin/env zx

/**
 * Shared utilities for git hooks
 * Provides consistent logging, file operations, and tool detection
 */

import { $, fs, path, chalk } from 'zx'

// Configure zx behavior
$.verbose = false

/**
 * Detect if we're in a DDEV environment and DDEV is available
 * @returns {Promise<boolean>}
 */
export async function isDdevRunning() {
  try {
    // Check if DDEV is available and we're in a DDEV project
    await $`ddev --version`.quiet()

    // Check if .ddev directory exists (indicates DDEV project)
    return await fs.pathExists('.ddev')
  } catch (error) {
    return false
  }
}

/**
 * Check if we're already inside a DDEV container
 * @returns {Promise<boolean>}
 */
export async function isInsideDdevContainer() {
  try {
    // Check if .ddev directory exists (indicates DDEV project)
    if (!(await fs.pathExists('.ddev'))) {
      return false
    }

    // Extract project name from DDEV config (matches runner.sh logic)
    const configPath = '.ddev/config.yaml'
    if (!(await fs.pathExists(configPath))) {
      return false
    }

    const config = await fs.readFile(configPath, 'utf8')
    // Match the exact logic from runner.sh: grep "name: " | head -1 | cut -f 2 -d ' '
    const lines = config.split('\n')
    const nameLine = lines.find(line => line.startsWith('name: '))
    if (!nameLine) {
      return false
    }

    const projectName = nameLine.split(' ')[1]?.trim()
    if (!projectName) {
      return false
    }

    const currentHostname = process.env.HOSTNAME || ''

    // Check if we're inside the DDEV web container (exact match from runner.sh)
    return currentHostname === `${projectName}-web`
  } catch (error) {
    return false
  }
}

/**
 * Execute a command with proper DDEV/direct context
 * @param {string[]} command - Command array to execute
 * @param {object} options - Execution options
 * @param {boolean} options.quiet - Run quietly without output
 * @param {boolean} options.showCommand - Show the command being executed
 * @returns {Promise<ProcessOutput>}
 */
export async function runWithRunner(command, options = {}) {
  const { quiet = false, showCommand = true } = options
  const commandStr = command.join(' ')

  // Determine execution context and build full command
  let fullCommand
  let contextLabel

  if (await isInsideDdevContainer()) {
    // Already inside DDEV container, execute directly
    fullCommand = command
    contextLabel = 'inside DDEV'
  } else if (await isDdevRunning()) {
    // DDEV is running, execute via ddev exec
    fullCommand = ['ddev', 'exec', ...command]
    contextLabel = 'via DDEV'
  } else {
    // No DDEV or not running, execute directly on host
    fullCommand = command
    contextLabel = 'direct'
  }

  // Show command if not quiet and showCommand is true
  if (!quiet && showCommand) {
    console.log(chalk.cyan(`🔧 Executing (${contextLabel}): ${commandStr}`))
  }

  // Execute with appropriate stdio handling
  const execOptions = quiet ? { stdio: 'pipe' } : { stdio: 'inherit' }
  return await $(execOptions)`${fullCommand}`
}/**
 * Logging utilities with consistent formatting
 */
export const log = {
  info: (message) => console.log(chalk.blue(`ℹ️  ${message}`)),
  success: (message) => console.log(chalk.green(`✅ ${message}`)),
  error: (message) => console.log(chalk.red(`❌ ${message}`)),
  warn: (message) => console.log(chalk.yellow(`⚠️  ${message}`)),
  step: (message) => console.log(chalk.cyan(`📋 ${message}`)),
  tool: (tool, message) => console.log(chalk.yellow(`🔧 Running ${tool}: ${message}`)),
  celebrate: (message) => console.log(chalk.green(`🎉 ${message}`)),
  skip: (message) => console.log(chalk.gray(`🚫 ${message}`))
}

/**
 * Get staged PHP files from git
 * @returns {Promise<string[]>} Array of PHP file paths
 */
export async function getStagedPhpFiles() {
  try {
    const result = await $`git diff --cached --name-only --diff-filter=ACMR`
    const allFiles = result.toString().trim().split('\n').filter(Boolean)

    // Filter for PHP files that actually exist
    const phpFiles = []
    for (const file of allFiles) {
      if (file.endsWith('.php') && await fs.pathExists(file)) {
        phpFiles.push(file)
      }
    }

    return phpFiles
  } catch (error) {
    log.error(`Failed to get staged files: ${error.message}`)
    return []
  }
}

/**
 * Check if a vendor binary exists
 * @param {string} toolName - Name of the tool (e.g., 'ecs', 'rector')
 * @returns {Promise<boolean>}
 */
export async function hasVendorBin(toolName) {
  const binPath = `./vendor/bin/${toolName}`
  return await fs.pathExists(binPath)
}

/**
 * Check if a composer package is installed
 * @param {string} packageName - Name of the package (e.g., 'phpunit/phpunit')
 * @returns {Promise<boolean>}
 */
export async function hasComposerPackage(packageName) {
  try {
    await $`composer show ${packageName}`.quiet()
    return true
  } catch (error) {
    return false
  }
}

/**
 * Check if we should skip checks due to environment variables or merge state
 * @returns {Promise<boolean>}
 */
export async function shouldSkipChecks() {
  // Check for bypass environment variable
  if (process.env.BYPASS_PHP_ANALYSIS === '1') {
    log.skip('BYPASS_PHP_ANALYSIS is set. Skipping code quality checks.')
    return true
  }

  // Check if we're in the middle of a merge
  if (await shouldSkipDuringMerge()) {
    log.skip('Merge in progress. Skipping code quality checks.')
    return true
  }

  return false
}

/**
 * Run a command and handle errors appropriately
 * @param {string} toolName - Name of the tool for logging
 * @param {() => Promise<any>} commandFn - Function that runs the command
 * @returns {Promise<boolean>} Success status
 */
export async function runTool(toolName, commandFn) {
  try {
    await commandFn()
    return true
  } catch (error) {
    log.error(`${toolName} failed`)
    if (error.stdout) {
      console.log(error.stdout)
    }
    if (error.stderr) {
      console.error(error.stderr)
    }
    return false
  }
}

/**
 * Check PHP syntax for given files
 * @param {string[]} phpFiles - Array of PHP file paths
 * @returns {Promise<boolean>} Success status
 */
export async function checkPhpSyntax(phpFiles) {
  log.tool('PHP Lint', 'Checking syntax...')

  for (const file of phpFiles) {
    try {
      await runWithRunner(['php', '-l', '-d', 'display_errors=0', file])
    } catch (error) {
      log.error(`PHP syntax error in: ${file}`)
      log.info('Fix the syntax error and try again.')
      return false
    }
  }

  log.success('PHP syntax check passed')
  return true
}

/**
 * Stage files after tool modifications
 * @param {string[]} files - Array of file paths to stage
 */
export async function stageFiles(files) {
  if (files.length === 0) return

  try {
    // Run git add inside DDEV container for consistency with tool execution
    for (const file of files) {
      await runWithRunner(['git', 'add', file], { quiet: true })
    }
  } catch (error) {
    log.warn(`Failed to stage some files: ${error.message}`)
  }
}

/**
 * Check if we're in a merge state and should skip checks
 * @returns {Promise<boolean>}
 */
export async function shouldSkipDuringMerge() {
  try {
    const gitDir = await $`git rev-parse --git-dir`.quiet()
    const mergeHead = path.join(gitDir.toString().trim(), 'MERGE_HEAD')

    if (await fs.pathExists(mergeHead)) {
      return true
    }
  } catch (error) {
    // Not in a git repository or other git error
  }

  return false
}

/**
 * Run a composer command with proper runner context
 * @param {string} command - Composer command (e.g., 'ecs', 'rector')
 * @param {string[]} args - Additional arguments
 * @param {object} options - Execution options
 * @returns {Promise<ProcessOutput>}
 */
export async function runComposerCommand(command, args = [], options = {}) {
  return await runWithRunner(['composer', command, ...args], options)
}

/**
 * Run a vendor binary with proper runner context
 * @param {string} toolName - Name of the tool binary
 * @param {string[]} args - Command arguments
 * @param {object} options - Execution options
 * @returns {Promise<ProcessOutput>}
 */
export async function runVendorBin(toolName, args = [], options = {}) {
  return await runWithRunner([`./vendor/bin/${toolName}`, ...args], options)
}
