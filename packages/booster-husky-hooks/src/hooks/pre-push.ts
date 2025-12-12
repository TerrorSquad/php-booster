#!/usr/bin/env zx

import { generateApiDocs, GitHook, runHook } from '../shared/index'

await runHook(GitHook.PrePush, async () => {
  await generateApiDocs()
  return true
})
