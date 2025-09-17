#!/usr/bin/env zx

/**
 * Pre-push hook - ZX TypeScript implementation
 *
 * Runs comprehensive checks before pushing:
 * - Architecture validation with Deptrac
 * - Test execution (PHPUnit)
 * - API documentation generation
 */

import { $, fs } from 'zx'
import {
  log,
  shouldSkipDuringMerge,
  runVendorBin,
  runTool,
  hasVendorBin,
  hasComposerPackage,
  runWithRunner,
  exitIfChecksFailed,
} from '../shared/utils.ts'

// Configure zx
$.verbose = false

/**
 * Check if vendor directory exists
 */
async function checkVendorDirectory(): Promise<void> {
  if (!(await fs.pathExists('./vendor'))) {
    log.error('vendor/ directory not found. Run composer install.')
    process.exit(1)
  }
}

/**
 * Run tests using the specified tool
 */
async function runTests(testTool: string, testBinary: string): Promise<boolean> {
  if (!(await hasComposerPackage(testTool))) {
    log.skip(`${testTool} not installed -> skipping tests`)
    return true
  }

  return await runTool(`${testTool} tests`, async () => {
    log.tool('Testing', `Running ${testTool} tests...`)
    await runVendorBin(testBinary)
    log.success(`${testTool} tests passed`)
  })
}

/**
 * Run Deptrac architecture analysis
 */
async function runDeptrac(): Promise<boolean> {
  if (!(await hasVendorBin('deptrac'))) {
    log.skip('Deptrac not found -> skipping architecture analysis')
    return true
  }

  const success = await runTool('Deptrac', async () => {
    log.tool('Deptrac', 'Running architecture analysis...')
    await runVendorBin('deptrac')
    log.success('Deptrac analysis passed')
  })

  if (success) {
    // Try to generate image if possible
    try {
      await runVendorBin('deptrac', ['--formatter=graphviz', '--output=deptrac.png'])
      if (await fs.pathExists('./deptrac.png')) {
        await runWithRunner(['git', 'add', 'deptrac.png'], { quiet: true })
        log.info('Added deptrac.png to staging area')
      }
    } catch (error: unknown) {
      // Image generation is optional, don't fail if it doesn't work
      log.info('Deptrac image generation skipped (optional)')
    }
  }

  return success
}

/**
 * Generate API documentation
 */
async function generateApiDocs(): Promise<boolean> {
  if (!(await hasComposerPackage('zircote/swagger-php'))) {
    log.skip('swagger-php not installed -> skipping API docs')
    return true
  }

  // Generate OpenAPI specification
  const specSuccess = await runTool('API spec generation', async () => {
    log.tool('API Documentation', 'Generating OpenAPI specification...')
    // Use swagger-php binary to scan for annotations and generate spec
    await runVendorBin('openapi', ['src/', '--output', 'documentation/openapi.yml'])
    log.success('OpenAPI specification generated')
  })

  if (!specSuccess) {
    return false
  }

  // Check if OpenAPI file was modified
  try {
    const diffResult = await runWithRunner(['git', 'diff', '--name-only'], { quiet: true })
    const modifiedFiles = diffResult.toString().trim().split('\n')

    if (modifiedFiles.includes('documentation/openapi.yml')) {
      log.tool('API Documentation', 'Generating HTML documentation...')

      try {
        await runWithRunner(['pnpm', 'generate:api-doc:html'])
        log.success('HTML documentation generated')

        // Stage the generated files
        await runWithRunner(
          ['git', 'add', 'documentation/openapi.html', 'documentation/openapi.yml'],
          { quiet: true },
        )

        // Check if there are staged changes and commit them
        try {
          await runWithRunner(['git', 'diff', '--cached', '--quiet'], { quiet: true })
          // If we get here, there are no staged changes
          log.info('No staged changes for API documentation')
        } catch {
          // There are staged changes, commit them
          await runWithRunner(['git', 'commit', '-m', 'chore: update API documentation'])
          log.success('API documentation committed')
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        log.error(`HTML documentation generation failed: ${errorMessage}`)
        return false
      }
    } else {
      log.info('No changes to OpenAPI specification, skipping HTML generation')
    }
  } catch (error: unknown) {
    // Git operations failed, but this is not critical
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.warn(`Could not check for OpenAPI changes: ${errorMessage}`)
  }

  return true
}

async function main(): Promise<void> {
  log.step('Starting pre-push checks...')

  // Check if we should skip all checks
  if (await shouldSkipDuringMerge()) {
    log.info('Skipping pre-push checks during merge')
    process.exit(0)
  }

  // Check dependencies
  await checkVendorDirectory()

  // Track overall success
  let allSuccessful = true

  // 1. Run architecture validation
  if (!(await runDeptrac())) {
    allSuccessful = false
  }

  // 2. Run tests
  if (!(await runTests('phpunit/phpunit', 'phpunit'))) {
    allSuccessful = false
  }

  // 3. Generate API documentation if necessary
  if (!(await generateApiDocs())) {
    allSuccessful = false
  }

  // Final result
  exitIfChecksFailed(allSuccessful)
}

// Run main function
try {
  await main()
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  log.error(`Unexpected error: ${errorMessage}`)
  process.exit(1)
}
