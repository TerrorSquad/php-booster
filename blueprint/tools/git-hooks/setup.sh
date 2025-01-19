#!/usr/bin/env bash

# check if env CI is set, if so we are in a CI environment and we should not install git hooks
if [ -n "$CI" ]; then
  echo "CI environment detected, skipping git hooks installation"
  exit 0
fi

echo "Installing Git hooks..."

if ! which pnpm; then
  # ANSI escape codes for colors
  RED='\033[0;31m'
  NC='\033[0m' # No Color

  echo ""
  echo "${RED}===================================================================${NC}"
  echo "${RED}  ERROR: Git Hooks Installation Failed - pnpm Missing              ${NC}"
  echo "${RED}===================================================================${NC}"
  echo ""
  echo "${RED}The installation of Git hooks has failed because pnpm is not      ${NC}"
  echo "${RED}found on your system. pnpm is required to manage the dependencies   ${NC}"
  echo "${RED}for the Git hooks.                                                  ${NC}"
  echo ""
  echo "${RED}To resolve this issue, please install pnpm using one of the following methods:${NC}"
  echo ""
  echo "${RED}- Official Installer:  https://pnpm.io/installation               ${NC}"
  echo "${RED}- Using npm:            npm install -g pnpm                       ${NC}"
  echo "${RED}- Using Homebrew (macOS): brew install pnpm                       ${NC}"
  echo ""
  echo "${RED}After installing pnpm, rerun 'composer install' to complete the setup.${NC}"
  echo "${RED}===================================================================${NC}"
  echo ""
  exit 1 # Exit with an error code
fi

rm -rf .husky
mkdir .husky
cp -r ./tools/git-hooks/hooks/* .husky

yes | pnpm install
