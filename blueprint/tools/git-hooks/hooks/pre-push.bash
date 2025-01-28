#!/usr/bin/env bash

ROOT=$(git rev-parse --show-toplevel)
runner="$ROOT/tools/runner.sh"

# Check if MERGE_HEAD exists
if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
    # Skip the hook during a merge
    exit 0
fi

function run_tests() {
    local test_tool=$1
    local test_command=$2

    if bash "$runner" composer show | grep -q "$test_tool"; then
        echo "Running $test_tool tests..."
        bash "$runner" composer "$test_command"
        if [ $? -ne 0 ]; then
            echo "Tests failed. Please fix the issues before committing."
            exit 1
        fi
    else
        echo "$test_tool is not installed. Skipping $test_tool tests..."
    fi

}

function generate_api_docs() {
    # Check if swagger-php is installed
    if ! bash "$runner" composer show | grep -q "zircote/swagger-php"; then
        echo "swagger-php is not installed. Skipping API documentation generation..."
        exit 0
    fi

    # Generate API documentation
    if ! bash "$runner" composer generate-api-spec; then
        echo "Failed to generate the API documentation"
        exit 1
    fi

    # Check if openapi.yml has been modified and exit if it's not
    git diff --name-only | grep -q openapi.yml || exit 0

    # Generate the HTML API documentation
    bash "$runner" pnpm generate:api-doc:html

    git add documentation
    git commit -m "chore: update API documentation"
}

# Run Pest or PHPUnit tests
run_tests "pestphp/pest" "test:coverage"
run_tests "phpunit/phpunit" "test:coverage"

# Generate API documentation if necessary
generate_api_docs
