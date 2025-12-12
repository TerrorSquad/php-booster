#!/usr/bin/env zx

import validateBranchNameConfig from '../../../booster/validate-branch-name.config.cjs'
import {
  formatDuration,
  getCurrentBranch,
  hasNodeBin,
  isSkipped,
  log,
  runTool,
  runWithRunner,
  shouldSkipDuringMerge,
} from '../shared/index'

// Minimal version of commit-msg logic, delegating to shared/index
// This file is adapted for package distribution; full logic may be left as-is.

async function main() {
  log.info('Booster commit-msg runner (package) - ensure you configure your project to use this package')
}

try {
  await main()
} catch (error) {
  log.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
