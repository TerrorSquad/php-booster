#!/usr/bin/env bash

rm -rf .husky || true
~/.volta/bin/pnpm install
cp -r ./tools/git-hooks-ddev/hooks .husky
