import { fs } from 'zx'
import { exec, log } from './core.ts'

/**
 * Generate Deptrac image and add to git
 */
export async function generateDeptracImage(): Promise<void> {
  // Check if deptrac is installed
  if (!(await fs.pathExists('./vendor/bin/deptrac'))) {
    return
  }

  try {
    // Use graphviz-image formatter to generate PNG directly
    await exec(
      ['./vendor/bin/deptrac', '--formatter=graphviz-image', '--output=deptrac.png'],
      { type: 'php' },
    )
    if (await fs.pathExists('./deptrac.png')) {
      await exec(['git', 'add', 'deptrac.png'], { quiet: true })

      // Check if there are staged changes for the image
      try {
        await exec(['git', 'diff', '--cached', '--quiet', 'deptrac.png'], { quiet: true })
      } catch {
        // Changes detected, commit them
        await exec(['git', 'commit', '-m', 'chore: update deptrac image'])
        log.success('Deptrac image updated and committed')
      }
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
    // Check if swagger-php is installed by looking for the binary
    // This avoids reading/parsing composer.lock
    if (await fs.pathExists('./vendor/bin/openapi')) {
      await exec(['composer', 'generate-api-spec'], { type: 'php' })

      const diffResult = await exec(['git', 'diff', '--name-only'], { quiet: true })
      const modifiedFiles = diffResult.toString().trim().split('\n')

      if (modifiedFiles.includes('documentation/openapi.yml')) {
        log.info('API spec changed, regenerating HTML...')

        try {
          await exec(['pnpm', 'generate:api-doc:html'])
          log.success('HTML documentation generated')

          // Stage the generated files
          await exec(
            ['git', 'add', 'documentation/openapi.html', 'documentation/openapi.yml'],
            { quiet: true },
          )

          // Check if there are staged changes and commit them
          try {
            await exec(['git', 'diff', '--cached', '--quiet'], { quiet: true })
            // If we get here, there are no staged changes
            log.info('No staged changes for API documentation')
          } catch {
            // There are staged changes, commit them
            await exec(['git', 'commit', '-m', 'chore: update API documentation'])
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
