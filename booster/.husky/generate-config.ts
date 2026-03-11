#!/usr/bin/env zx

/**
 * Generate .git-hooks.config.json from the dist template.
 *
 * Usage:
 *   zx .husky/generate-config.ts        # interactive
 *   npm run hooks:init                   # same via package.json script
 */

import { chalk, fs } from 'zx'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_PATH = resolve(__dirname, '.git-hooks.config.dist.json')
const TARGET_PATH = resolve(process.cwd(), '.git-hooks.config.json')

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((res) => {
    rl.question(question, (answer) => {
      rl.close()
      res(answer.trim())
    })
  })
}

if (!(await fs.pathExists(DIST_PATH))) {
  console.error(chalk.red(`✗ Dist template not found: ${DIST_PATH}`))
  process.exit(1)
}

const distContents = await fs.readFile(DIST_PATH, 'utf-8')

if (await fs.pathExists(TARGET_PATH)) {
  const answer = await prompt(chalk.yellow('.git-hooks.config.json already exists. Overwrite? [y/N] '))
  if (!answer.match(/^y(es)?$/i)) {
    console.log('Aborted. Existing config kept.')
    process.exit(0)
  }
}

await fs.writeFile(TARGET_PATH, distContents, 'utf-8')

console.log(chalk.green('✓ Created .git-hooks.config.json'))
console.log(chalk.gray('  Edit it to enable/disable tools for each hook.'))
console.log(chalk.gray('  Run `npm run hooks:init` again to reset to defaults.'))
