import type { ToolConfig } from './types.ts'

/**
 * Centralized tool configurations
 *
 * To add a new tool:
 * 1. Add a new object to the TOOLS array
 * 2. Configure the tool properties (name, command, args, etc.)
 * 3. Ensure the tool is installed in your project (package.json or composer.json)
 *
 * Tool groups for selective execution (HOOKS_ONLY env var):
 * - 'format': Formatting tools (Prettier, ECS)
 * - 'lint': Linting tools (ESLint, Stylelint, PHP Syntax, TypeScript)
 * - 'analysis': Static analysis (PHPStan, Psalm, Deptrac)
 * - 'security': Security tools (PHP Security Checker)
 * - 'refactor': Code refactoring (Rector)
 */

/**
 * All quality tools (JS/TS and PHP)
 */
export const TOOLS: ToolConfig[] = [
  // JavaScript/TypeScript Tools
  {
    name: 'ESLint',
    command: 'eslint',
    args: ['--fix', '--cache', '--no-warn-ignored'],
    type: 'node',
    stagesFilesAfter: true,
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.mjs', '.cjs'],
    group: 'lint',
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
    group: 'format',
  },
  {
    name: 'Flatten JSON',
    command: 'node',
    args: ['./tools/flatten-json.ts'],
    type: 'node',
    extensions: ['.json'],
    includePatterns: ['apps/*/src/locales/*.json'],
    stagesFilesAfter: true,
    group: 'format',
  },
  {
    name: 'Stylelint',
    command: 'stylelint',
    args: ['--fix', '--allow-empty-input', '--cache'],
    type: 'node',
    stagesFilesAfter: true,
    extensions: ['.vue', '.css', '.scss', '.sass', '.less'],
    group: 'lint',
  },
  {
    name: 'TypeScript',
    command: 'tsc',
    args: ['--noEmit', '--skipLibCheck'],
    type: 'node',
    passFiles: false, // tsc uses tsconfig.json, not file list
    extensions: ['.ts', '.tsx'],
    group: 'lint',
    description: 'Type-checking TypeScript files...',
  },
  {
    name: 'Markdownlint',
    command: 'markdownlint-cli2',
    args: [],
    type: 'node',
    extensions: ['.md'],
    group: 'lint',
  },
  {
    name: 'jscpd',
    command: 'jscpd',
    args: ['--ignore', '**/*.d.ts,**/node_modules/**,**/vendor/**,**/.ddev/**,**/var/**,**/public/**,**/storage/**,**/tests/_output/**'],
    type: 'node',
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.css', '.scss'],
    passFiles: false, // Runs on whole project by default
    group: 'analysis',
  },
  {
    name: 'Knip',
    command: 'knip',
    args: ['--no-exit-code'],
    type: 'node',
    passFiles: false, // Analyzes project structure
    group: 'analysis',
  },

  // PHP Tools
  {
    name: 'PHP Syntax Check',
    command: 'php',
    args: ['-l', '-d', 'display_errors=0'],
    type: 'php',
    runForEachFile: true,
    extensions: ['.php'],
    onFailure: 'stop', // Stop subsequent tools if syntax check fails
    group: 'lint',
  },
  {
    name: 'Rector',
    command: 'rector',
    args: ['process'],
    type: 'php',
    stagesFilesAfter: true,
    extensions: ['.php'],
    group: 'refactor',
  },
  {
    name: 'Composer Validate',
    command: 'composer',
    args: ['validate', '--strict', '--ansi'],
    type: 'php',
    passFiles: false, // Runs on composer.json
    extensions: ['composer.json', 'composer.lock'],
     // Only run if composer.json exists
    includePatterns: ['composer.json'],
    group: 'lint',
  },
  {
    name: 'PHP Security Checker',
    command: 'security-checker',
    args: ['security:check', '--ansi'],
    type: 'php',
    passFiles: false, // Runs on composer.lock
    extensions: ['composer.lock'],
    group: 'security',
  },
  {
    name: 'ECS',
    command: 'ecs',
    args: ['check', '--fix'],
    type: 'php',
    stagesFilesAfter: true,
    extensions: ['.php'],
    group: 'format',
  },
  {
    name: 'PHPStan',
    command: 'phpstan',
    args: ['analyse'],
    type: 'php',
    extensions: ['.php'],
    group: 'analysis',
  },
  {
    name: 'Psalm',
    command: 'psalm',
    commandAlternatives: ['psalm.phar'],
    type: 'php',
    extensions: ['.php'],
    group: 'analysis',
  },
  {
    name: 'Deptrac',
    command: 'deptrac',
    args: ['analyse', '--no-cache'],
    type: 'php',
    passFiles: false,
    extensions: ['.php'],
    group: 'analysis',
  },
]
