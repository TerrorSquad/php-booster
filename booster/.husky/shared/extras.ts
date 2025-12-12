import { fs } from 'zx'
import { log, runWithRunner } from './core.ts'
import { runVendorBin } from './workflow.ts'

/**
 * Check if a Composer package is installed
 * @param packageName Name of the package (e.g., 'phpunit/phpunit')
 */
export async function hasComposerPackage(packageName: string): Promise<boolean> {
  try {
    const composerLockPath = './composer.lock'
    if (!(await fs.pathExists(composerLockPath))) {
      return false
    }

    const lockContent = await fs.readFile(composerLockPath, 'utf8')
    const lockData = JSON.parse(lockContent)

    // Check in both packages and packages-dev arrays
    const allPackages = [...(lockData.packages || []), ...(lockData['packages-dev'] || [])]

    return allPackages.some((pkg: any) => pkg.name === packageName)
  } catch (error: unknown) {
    return false
  }
}

/**
 * Generate Deptrac image and add to git
 */
export async function generateDeptracImage(): Promise<void> {
  try {
    // Use graphviz-image formatter to generate PNG directly
    await runVendorBin('deptrac', ['--formatter=graphviz-image', '--output=deptrac.png'])
    if (await fs.pathExists('./deptrac.png')) {
      await runWithRunner(['git', 'add', 'deptrac.png'], { quiet: true })
      log.info('Added deptrac.png to staging area')
    }
  } catch (error: unknown) {
    // Image generation is optional, don't fail if it doesn't work
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.warn(`Deptrac image generation failed: ${errorMessage}`)
  }
}

/**
 * Generate API documentation if OpenAPI spec has changed
 */
export async function generateApiDocs(): Promise<void> {
  log.tool('API Documentation', 'Generating OpenAPI specification...')
  try {
    if (await hasComposerPackage('zircote/swagger-php')) {
      await runWithRunner(['composer', 'generate-api-spec'])

      const diffResult = await runWithRunner(['git', 'diff', '--name-only'], { quiet: true })
      const modifiedFiles = diffResult.toString().trim().split('\n')

      if (modifiedFiles.includes('documentation/openapi.yml')) {
        log.info('API spec changed, regenerating HTML...')

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
          throw error
        }
      } else {
        log.info('No changes to OpenAPI specification, skipping HTML generation')
      }
    } else {
      log.info('swagger-php not installed -> skipping API docs.')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error(`API spec generation failed: ${errorMessage}`)
    // Don't throw, just log error, as this might be optional?
    // Original pre-push returned false on error.
    throw error
  }
}
