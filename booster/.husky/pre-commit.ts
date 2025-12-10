#!/usr/bin/env zx

/**
 * Pre-commit hook - ZX TypeScript implementation
 *
 * Runs PHP quality tools on staged files:
 * - PHP Lint (syntax check)
 * - Rector (auto-fixes)
 * - ECS (code style auto-fixes)
 * - PHPStan (static analysis)
 * - Psalm (static analysis)
 *
 * Environment Variables:
 * - SKIP_PRECOMMIT=1: Skip the entire pre-commit hook
 * - GIT_HOOKS_VERBOSE=1: Enable verbose output for debugging
 * - SKIP_RECTOR=1: Skip Rector refactoring
 * - SKIP_ECS=1: Skip ECS code style fixes
 * - SKIP_PHPSTAN=1: Skip PHPStan static analysis
 * - SKIP_PSALM=1: Skip Psalm static analysis
 * - SKIP_DEPTRAC=1: Skip Deptrac architecture analysis
 */

import { $, fs } from 'zx'
import {
  checkPhpSyntax,
  formatDuration,
  getStagedPhpFiles,
  getPsalmBinary,
  isSkipped,
  log,
  PHPTool,
  runTool,
  runVendorBin,
  runWithRunner,
  shouldRunTool,
  shouldSkipDuringMerge,
  stageFiles,
} from './shared/utils.ts'

// Configure zx
$.verbose = process.env.GIT_HOOKS_VERBOSE === '1' || process.env.GIT_HOOKS_VERBOSE === 'true'

// Fix locale issues that can occur in VS Code
process.env.LC_ALL = 'C'
process.env.LANG = 'C'

/**
 * Configuration for a PHP quality tool
 */
interface ToolConfig {
  name: string
  description: string
  shouldRun: () => Promise<boolean>
  run: (files: string[], binary?: string) => Promise<void>
  stagesFilesAfter?: boolean
  required?: boolean
  getBinary?: () => Promise<string | null>
}

/**
 * Centralized tool configurations
 */
const TOOLS: ToolConfig[] = [
  {
    name: 'Rector',
    description: 'Running automatic refactoring...',
    shouldRun: () => shouldRunTool(PHPTool.RECTOR),
    run: async (files) => { await runVendorBin('rector', ['process', '--ansi', ...files]) },
    stagesFilesAfter: true,
  },
  {
    name: 'ECS',
    description: 'Running code style fixes...',
    shouldRun: () => shouldRunTool(PHPTool.ECS),
    run: async (files) => { await runVendorBin('ecs', ['check', '--fix', '--ansi', ...files]) },
    stagesFilesAfter: true,
  },
  {
    name: 'PHPStan',
    description: 'Running static analysis...',
    shouldRun: () => shouldRunTool(PHPTool.PHPSTAN),
    run: async (files) => { await runVendorBin('phpstan', ['analyse', '-c', 'phpstan.neon.dist', ...files]) },
  },
  {
    name: 'Deptrac',
    description: 'Running architecture analysis...',
    shouldRun: async () => {
      if (!(await shouldRunTool(PHPTool.DEPTRAC))) {
        return false
      }
      if (!(await fs.pathExists('deptrac.yaml')) && !(await fs.pathExists('deptrac.yml'))) {
        log.skip('deptrac.yaml (or .yml) not found. Skipping Deptrac...')
        return false
      }
      return true
    },
    run: async (files) => {
      await runVendorBin('deptrac')

      // Optional: Generate and add deptrac image if configured
      try {
        await runVendorBin('deptrac', ['--formatter=graphviz', '--output=deptrac.png'])
        if (await fs.pathExists('./deptrac.png')) {
          await runWithRunner(['git', 'add', 'deptrac.png'], { quiet: true })
          log.info('Added deptrac.png to staging area')
        }
      } catch (error: unknown) {
        // Image generation is optional, don't fail if it doesn't work
        const errorMessage = error instanceof Error ? error.message : String(error)
        log.warn(`Deptrac image generation failed: ${errorMessage}`)
      }
    },
  },
  {
    name: 'Psalm',
    description: 'Running static analysis...',
    shouldRun: async () => {
      // Use shouldRunTool with checkVendorBin=false since Psalm has custom binary detection
      if (!(await shouldRunTool(PHPTool.PSALM, false))) {
        return false
      }
      // Check if either psalm or psalm.phar exists
      return await getPsalmBinary() !== null
    },
    getBinary: () => getPsalmBinary(),
    run: async (files, binary) => {
      const psalmBin = binary || 'psalm'
      await runVendorBin(psalmBin, ['--show-info=false', ...files])
    },
  },
]/**
 * Run all configured quality tools on the provided files
 *
 * Strategy:
 * 1. Run file-modifying tools (Rector, ECS) sequentially first.
 *    This ensures code is formatted before analysis.
 * 2. Run read-only analysis tools (PHPStan, Psalm, Deptrac) in parallel.
 *    This significantly reduces total execution time.
 */
async function runQualityTools(phpFiles: string[]): Promise<boolean> {
  let allSuccessful = true

  // Split tools into sequential (modifiers) and parallel (analyzers)
  const sequentialTools = TOOLS.filter((t) => t.stagesFilesAfter)
  const parallelTools = TOOLS.filter((t) => !t.stagesFilesAfter)

  // 1. Run sequential tools (modifiers)
  for (const tool of sequentialTools) {
    if (!(await tool.shouldRun())) continue

    // Get the binary to use (if the tool supports custom binary detection)
    const binary = tool.getBinary ? await tool.getBinary() : null

    // Skip if binary detection failed for tools that require it
    if (tool.getBinary && binary === null) {
      log.skip(`${tool.name} binary not found. Skipping...`)
      continue
    }

    const success = await runTool(tool.name, tool.description, () =>
      binary !== null ? tool.run(phpFiles, binary) : tool.run(phpFiles),
    )

    if (success && tool.stagesFilesAfter) {
      await stageFiles(phpFiles)
    }

    if (!success) {
      allSuccessful = false
      if (tool.required) {
        log.error(`${tool.name} is required but failed`)
        return false
      }
    }
  }

  // 2. Run parallel tools (analyzers)
  // We map each tool to a promise that resolves to its success status
  const parallelPromises = parallelTools.map(async (tool) => {
    if (!(await tool.shouldRun())) return true

    const binary = tool.getBinary ? await tool.getBinary() : null

    if (tool.getBinary && binary === null) {
      log.skip(`${tool.name} binary not found. Skipping...`)
      return true
    }

    // Note: Logs from parallel tools will be interleaved
    const success = await runTool(tool.name, tool.description, () =>
      binary !== null ? tool.run(phpFiles, binary) : tool.run(phpFiles),
    )

    if (!success && tool.required) {
      log.error(`${tool.name} is required but failed`)
    }

    return success
  })

  // Wait for all parallel tools to complete
  const results = await Promise.all(parallelPromises)

  // If any parallel tool failed, the overall result is failure
  if (results.some((res) => !res)) {
    allSuccessful = false
  }

  return allSuccessful
}

async function main(): Promise<void> {
  const startTime = Date.now()

  log.step('Starting pre-commit checks...')

  // Check if we should skip the entire hook
  if (isSkipped('precommit')) {
    log.info('Skipping pre-commit checks (SKIP_PRECOMMIT environment variable set)')
    process.exit(0)
  }

  // Check if we should skip all checks
  if (await shouldSkipDuringMerge()) {
    log.info('Skipping pre-commit checks during merge')
    process.exit(0)
  }

  // Get staged PHP files
  const phpFiles = await getStagedPhpFiles()

  if (phpFiles.length === 0) {
    log.info('No PHP files staged for commit. Skipping PHP quality checks.')
    process.exit(0)
  }

  log.info(`Found ${phpFiles.length} staged PHP file(s): ${phpFiles.join(', ')}`)

  // Check PHP syntax first
  if (!(await checkPhpSyntax(phpFiles))) {
    process.exit(1)
  }

  // Run all quality tools
  let allSuccessful = await runQualityTools(phpFiles)

  // Final result with performance summary
  const totalDuration = Date.now() - startTime
  const formattedTotalDuration = formatDuration(totalDuration)

  if (allSuccessful) {
    log.celebrate(`All pre-commit checks passed! (Total time: ${formattedTotalDuration})`)
  } else {
    log.error(
      `Some pre-commit checks failed after ${formattedTotalDuration}. Please fix the issues and try again.`,
    )
    process.exit(1)
  }
}

// Run main function
try {
  await main()
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  log.error(`Unexpected error: ${errorMessage}`)
  process.exit(1)
}
