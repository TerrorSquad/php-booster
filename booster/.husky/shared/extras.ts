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
 * Check if deptrac.png was freshly written and whether it differs from git HEAD.
 *
 * @param mtimeBefore - mtime of the file before deptrac ran (0 if it didn't exist)
 * @returns ArtifactResult with generated=true if freshly written, changed=true if content differs from git
 */
async function checkDeptracImage(mtimeBefore: number): Promise<ArtifactResult> {
  if (!(await fs.pathExists('./deptrac.png'))) {
    return { generated: false, changed: false }
  }

  const mtimeAfter = (await fs.stat('./deptrac.png')).mtimeMs
  if (mtimeAfter <= mtimeBefore) {
    // File was not rewritten during this run — stale from a previous run
    return { generated: false, changed: false }
  }

  // File was freshly generated. Check if content differs from what's in git.
  try {
    const diffResult = await exec(['git', 'diff', '--name-only', '--', 'deptrac.png'], {
      quiet: true,
    })
    const changed = diffResult.toString().trim().includes('deptrac.png')
    return { generated: true, changed, path: 'deptrac.png' }
  } catch {
    // git diff can fail if the file is untracked; treat as changed
    return { generated: true, changed: true, path: 'deptrac.png' }
  }
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

  log.tool('Deptrac', 'Generating architecture diagram...')

  // Capture mtime before running so we can detect if the file was (re)written
  const mtimeBefore = (await fs.pathExists('./deptrac.png'))
    ? (await fs.stat('./deptrac.png')).mtimeMs
    : 0

  try {
    await exec(
      ['./vendor/bin/deptrac', '--formatter=graphviz-image', '--output=deptrac.png'],
      { type: 'php' },
    )

    const result = await checkDeptracImage(mtimeBefore)
    if (result.generated) {
      log.success(`Deptrac image generated${result.changed ? '' : ' (unchanged)'}: deptrac.png`)
    }
    return result
  } catch (error: unknown) {
    // Deptrac exits with code 1 when violations are found, but still generates the image.
    // Check if the file was freshly written despite the non-zero exit.
    const result = await checkDeptracImage(mtimeBefore)
    if (result.generated) {
      const status = result.changed ? '' : ' (unchanged)'
      log.success(`Deptrac image generated (violations found)${status}: deptrac.png`)
      return result
    }

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
