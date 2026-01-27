import { fs } from 'zx'
import { exec, log } from './core.ts'

/**
 * Result of artifact generation
 */
export interface ArtifactResult {
  generated: boolean
  changed: boolean
  path?: string
}

/**
 * Generate Deptrac architecture diagram
 *
 * Generates a PNG image showing the dependency graph.
 * Does NOT auto-commit - leaves that to the developer or CI.
 */
export async function generateDeptracImage(): Promise<ArtifactResult> {
  // Check if deptrac is installed
  if (!(await fs.pathExists('./vendor/bin/deptrac'))) {
    log.skip('Deptrac not installed, skipping image generation')
    return { generated: false, changed: false }
  }

  try {
    log.tool('Deptrac', 'Generating architecture diagram...')

    await exec(
      ['./vendor/bin/deptrac', '--formatter=graphviz-image', '--output=deptrac.png'],
      { type: 'php' },
    )

    if (await fs.pathExists('./deptrac.png')) {
      log.success('Deptrac image generated: deptrac.png')
      return { generated: true, changed: true, path: 'deptrac.png' }
    }

    return { generated: false, changed: false }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.warn(`Deptrac image generation failed: ${errorMessage}`)
    return { generated: false, changed: false }
  }
}

/**
 * Generate API documentation from OpenAPI annotations
 *
 * Generates both the YAML spec and HTML documentation.
 * Does NOT auto-commit - leaves that to the developer or CI.
 */
export async function generateApiDocs(): Promise<ArtifactResult> {
  // Check if swagger-php is installed
  if (!(await fs.pathExists('./vendor/bin/openapi'))) {
    log.skip('swagger-php not installed, skipping API docs generation')
    return { generated: false, changed: false }
  }

  log.tool('API Documentation', 'Generating OpenAPI specification...')

  try {
    await exec(['composer', 'generate-api-spec'], { type: 'php' })
    log.success('OpenAPI specification generated')

    // Check if spec changed
    const diffResult = await exec(['git', 'diff', '--name-only'], { quiet: true })
    const modifiedFiles = diffResult.toString().trim().split('\n')

    if (modifiedFiles.includes('openapi/openapi.yml')) {
      log.info('API spec changed, regenerating HTML...')

      await exec(['pnpm', 'generate:api-doc:html'])
      log.success('HTML documentation generated')

      log.info('Artifacts generated. Remember to commit: openapi/openapi.yml, openapi/openapi.html')
      return { generated: true, changed: true, path: 'openapi/openapi.yml' }
    }

    log.info('No changes to OpenAPI specification')
    return { generated: true, changed: false }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error(`API documentation generation failed: ${errorMessage}`)
    throw error
  }
}
