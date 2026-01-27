import type { ToolConfig } from './types.ts'

/**
 * Centralized tool configurations
 *
 * To add a new tool:
 * 1. Add a new object to the TOOLS array
 * 2. Configure the tool properties (name, command, args, etc.)
 * 3. Ensure the tool is installed in your project (package.json or composer.json)
 */

/**
 * All quality tools (JS/TS and PHP)
 */
export const TOOLS: ToolConfig[] = [
  // JavaScript/TypeScript Tools
  {
    name: 'ESLint',
    command: 'eslint',
    args: ['--fix', '--cache'],
    type: 'node',
    stagesFilesAfter: true,
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.mjs', '.cjs'],
  },
  {
    name: 'Prettier',
    command: 'prettier',
    args: ['--write', '--ignore-unknown', '--cache'],
    type: 'node',
    stagesFilesAfter: true,
    extensions: [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.vue',
      '.mjs',
      '.cjs',
      '.json',
      '.md',
      '.yml',
      '.yaml',
      '.css',
      '.scss',
    ],
  },
  {
    name: 'Stylelint',
    command: 'stylelint',
    args: ['--fix', '--allow-empty-input'],
    type: 'node',
    stagesFilesAfter: true,
    extensions: ['.vue', '.css', '.scss', '.sass', '.less'],
  },

  // PHP Tools
  {
    name: 'PHP Syntax Check',
    command: 'php',
    args: ['-l', '-d', 'display_errors=0'],
    type: 'php',
    runForEachFile: true,
    extensions: ['.php'],
    blocking: true, // Stop subsequent tools if syntax check fails
  },
  {
    name: 'Rector',
    command: 'rector',
    args: ['process'],
    type: 'php',
    stagesFilesAfter: true,
    extensions: ['.php'],
  },
  {
    name: 'ECS',
    command: 'ecs',
    args: ['check', '--fix'],
    type: 'php',
    stagesFilesAfter: true,
    extensions: ['.php'],
  },
  {
    name: 'PHPStan',
    command: 'phpstan',
    args: ['analyse'],
    type: 'php',
    extensions: ['.php'],
  },
  {
    name: 'Psalm',
    command: 'psalm',
    type: 'php',
    extensions: ['.php'],
  },
  {
    name: 'Deptrac',
    command: 'deptrac',
    args: ['analyse', '--no-cache'],
    type: 'php',
    passFiles: false,
    extensions: ['.php'],
  },
]
