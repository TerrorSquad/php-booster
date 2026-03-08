#!/usr/bin/env bash

# Build test fixtures for Laravel and Symfony
# Creates tarball archives ready for upload as GitHub release assets
# Usage: bash build-fixtures.sh [output_dir]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${1:-$REPO_ROOT}"
TEMP_DIR=$(mktemp -d)

# Normalize output path to absolute so tar writes correctly after changing directories.
if [[ "$OUTPUT_DIR" != /* ]]; then
  OUTPUT_DIR="$REPO_ROOT/$OUTPUT_DIR"
fi

echo "🏗️  Building test fixtures..."
echo "Repository root: $REPO_ROOT"
echo "Output directory: $OUTPUT_DIR"
echo "Temporary directory: $TEMP_DIR"
echo ""

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Function to build a fixture
build_fixture() {
  local framework=$1
  local create_cmd=$2
  local additional_deps=$3

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Building ${framework^} fixture..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local fixture_dir="$TEMP_DIR/$framework"
  mkdir -p "$fixture_dir"
  cd "$fixture_dir"

  echo "  Creating $framework project..."
  eval "$create_cmd"

  # Install additional dependencies if specified
  if [ -n "$additional_deps" ]; then
    echo "  Installing additional dependencies..."
    eval "$additional_deps"
  fi

  echo "  Initializing Git repository..."
  git init -b main
  git config user.name "Test Fixtures Bot"
  git config user.email "fixtures@php-booster.dev"
  git add .
  git commit -m "feat: initial $framework project"

  echo "  Cleaning up unnecessary files..."
  rm -rf .git/hooks/*

  if [ "$framework" = "laravel" ]; then
    rm -rf storage/logs/*.log
    rm -rf storage/framework/cache/data/*
    rm -rf storage/framework/sessions/*
    rm -rf storage/framework/views/*
    touch storage/logs/.gitkeep
    touch storage/framework/cache/data/.gitkeep
    touch storage/framework/sessions/.gitkeep
    touch storage/framework/views/.gitkeep
  elif [ "$framework" = "symfony" ]; then
    rm -rf var/cache/*
    rm -rf var/log/*.log
    touch var/cache/.gitkeep
    touch var/log/.gitkeep
  fi

  # Create version file
  date +%Y-%m-%d > FIXTURE_VERSION

  echo "  Creating tarball..."
  cd "$TEMP_DIR"
  tar czf "$OUTPUT_DIR/${framework}-fixture.tar.gz" "$framework/"

  local size=$(du -h "$OUTPUT_DIR/${framework}-fixture.tar.gz" | cut -f1)
  echo "  ✅ ${framework^} fixture built: ${framework}-fixture.tar.gz ($size)"
  echo ""
}

# Build Laravel fixture
build_fixture \
  "laravel" \
  "composer create-project laravel/laravel:^11 . --no-interaction --prefer-dist" \
  ""

# Build Symfony fixture
build_fixture \
  "symfony" \
  "composer create-project symfony/skeleton:^7.0 . --no-interaction --prefer-dist" \
  "composer require webapp --no-interaction"

# Cleanup
rm -rf "$TEMP_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All fixtures built successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Output files:"
ls -lh "$OUTPUT_DIR"/*-fixture.tar.gz 2>/dev/null || echo "  (files in $OUTPUT_DIR)"
echo ""
echo "These archives can be uploaded as GitHub release assets."
