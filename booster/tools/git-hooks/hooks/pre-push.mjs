#!/usr/bin/env zx

/**
 * Pre-push hook - ZX implementation
 *
 * Runs comprehensive checks before pushing:
 * - Architecture validation with Deptrac
 * - Test execution (PHPUnit)
 * - API documentation generation
 */

import { $, fs } from 'zx'
import {
  log,
  shouldSkipChecks,
  runVendorBin,
  runTool,
  hasVendorBin,
  hasComposerPackage
} from '../shared/utils.mjs'

// Configure zx
$.verbose = false

/**
 * Check if vendor directory exists
 */
async function checkVendorDirectory() {
  if (!(await fs.pathExists('./vendor'))) {
    log.error('vendor/ directory not found. Run composer install.')
    process.exit(1)
  }
}

/**
 * Run tests using the specified tool
 */
async function runTests(testTool, testBinary) {
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
async function runDeptrac() {
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
        await $`git add deptrac.png`
        log.info('Added deptrac.png to staging area')
      }
    } catch (error) {
      // Image generation is optional, don't fail if it doesn't work
      log.info('Deptrac image generation skipped (optional)')
    }
  }

  return success
}

/**
 * Generate API documentation
 */
async function generateApiDocs() {
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
    const diffResult = await $`git diff --name-only`.quiet()
    const modifiedFiles = diffResult.toString().trim().split('\n')

    if (modifiedFiles.includes('documentation/openapi.yml')) {
      log.tool('API Documentation', 'Generating HTML documentation...')

      try {
        await $`${runner} pnpm generate:api-doc:html`
        log.success('HTML documentation generated')

        // Stage the generated files
        await $`git add documentation/openapi.html documentation/openapi.yml`

        // Check if there are staged changes and commit them
        const stagedChanges = await $`git diff --cached --quiet`.quiet().catch(() => false)
        if (!stagedChanges) {
          await $`git commit -m "chore: update API documentation"`
          log.success('API documentation committed')
        }
      } catch (error) {
        log.error('HTML documentation generation failed')
        return false
      }
    } else {
      log.info('No changes to OpenAPI specification, skipping HTML generation')
    }
  } catch (error) {
    // Git operations failed, but this is not critical
    log.warn('Could not check for OpenAPI changes')
  }

  return true
}

async function main() {
  log.step('Starting pre-push checks...')

  // Check if we should skip all checks
  if (await shouldSkipChecks()) {
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
  if (allSuccessful) {
    log.celebrate('All pre-push checks passed!')
    process.exit(0)
  } else {
    log.error('Some pre-push checks failed. Please fix the issues and try again.')
    process.exit(1)
  }
}

// Run main function
try {
  await main()
} catch (error) {
  log.error(`Unexpected error: ${error.message}`)
  process.exit(1)
}
