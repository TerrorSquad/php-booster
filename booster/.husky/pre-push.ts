#!/usr/bin/env zx

import { $, fs } from 'zx'
import { generateApiDocs, GitHook, log, runHook, runWithRunner } from './shared/index.ts'

await runHook(GitHook.PrePush, async () => {
  // 1. Check vendor directory
  if (!(await fs.pathExists('vendor/autoload.php'))) {
    log.error('Vendor directory not found. Please run "composer install".')
    return false
  }

  // 2. Run Deptrac (Architecture check) - Optional/Commented out in original
  // if (await fs.pathExists('vendor/bin/deptrac')) {
  //   log.tool('Deptrac', 'Running architecture analysis...')
  //   try {
  //     await runWithRunner(['composer', 'deptrac'])
  //     log.success('Deptrac check passed')
  //   } catch (e) {
  //     log.error('Deptrac found architectural violations')
  //     return false
  //   }
  // }

  // 3. Run PHPUnit
  if (await fs.pathExists('vendor/bin/pest')) {
    log.tool('PHPUnit', 'Running tests...')
    try {
      await runWithRunner(['composer', 'test:coverage:pest'])
      log.success('Tests passed')
    } catch (e) {
      log.error('Tests failed')
      return false
    }
  }

  // 4. Generate API Docs
  try {
    await generateApiDocs()
  } catch (e) {
    // generateApiDocs logs the error
    return false
  }

  return true
})
