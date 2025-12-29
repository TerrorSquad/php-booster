#!/usr/bin/env bash

# Script to generate a distribution pnpm-lock.yaml (without dev-only dependencies like vitest)
# This ensures end-users get a clean lockfile that matches their filtered package.json

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Generating pnpm-lock.dist.yaml..."

# Backup original files
cp package.json package.json.bak
cp pnpm-lock.yaml pnpm-lock.yaml.bak

# Remove vitest from package.json using jq
if command -v jq >/dev/null 2>&1; then
    jq 'del(.devDependencies.vitest) | del(.devDependencies["@vitest/coverage-v8"])' package.json > package.json.tmp && mv package.json.tmp package.json
else
    echo "Error: jq is required but not installed."
    exit 1
fi

# Generate new lockfile
# We use --lockfile-only to avoid installing packages, just update the lockfile
pnpm install --lockfile-only

# Save the generated lockfile as the distribution version
cp pnpm-lock.yaml pnpm-lock.dist.yaml

echo "pnpm-lock.dist.yaml generated successfully."

# Restore original files
mv package.json.bak package.json
mv pnpm-lock.yaml.bak pnpm-lock.yaml

echo "Original files restored."
