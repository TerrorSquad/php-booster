#!/usr/bin/env zx

import { generateDeptracImage, getStagedFiles, GitHook, log, runHook, runQualityTools } from '../shared/index'
import { TOOLS } from '../shared/tools'

await runHook(GitHook.PreCommit, async () => {
  const files = await getStagedFiles()

  if (files.length === 0) {
    log.info('No files staged for commit. Skipping quality checks.')
    process.exit(0)
  }

  log.info(`Found ${files.length} staged file(s): ${files.join(', ')}`)

  const success = await runQualityTools(files, TOOLS)

  // Optional: Generate Deptrac image
  await generateDeptracImage()

  return success
})
