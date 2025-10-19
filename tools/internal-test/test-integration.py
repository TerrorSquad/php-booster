#!/usr/bin/env python3
"""
PHP Booster Integration Test Script (Refactored)

A clean, modular entry point for testing the PHP Booster integration.
The heavy lifting is now done by specialized modules in the lib/ directory.
"""

import argparse
import os
import sys
from pathlib import Path

from lib import Config, TestOrchestrator


def create_config() -> Config:
    """Create configuration from command line arguments"""
    parser = argparse.ArgumentParser(
        description="Integration test script for PHP Booster",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s env-check                    # Check environment and requirements
  %(prog)s setup laravel my-test-app    # Set up a Laravel test project
  %(prog)s integrate laravel my-test-app # Integrate booster into existing project
  %(prog)s full laravel my-test-app     # Run complete test suite
  %(prog)s test-hooks laravel my-test-app # Test git hooks functionality
  %(prog)s test-github-actions laravel my-test-app # Test GitHub Actions integration
  %(prog)s test-interactive             # Test interactive mode without requiring a project
  %(prog)s test-interactive-project laravel my-test-app # Test interactive mode with a project
  %(prog)s test-interactive-project laravel my-test-app --automated # Automated interactive test
  %(prog)s clean-interactive-test       # Clean up interactive test directory
  %(prog)s clean laravel my-test-app    # Clean up test environment
  %(prog)s status laravel my-test-app   # Show current status

Supported project types: laravel, symfony

The script creates test projects in tests/<project_type>/<project_name>
relative to the repository root unless --target-dir is specified.
""",
    )

    parser.add_argument(
        "action",
        choices=[
            "full",
            "env-check",
            "setup",
            "setup-resume",
            "integrate",
            "verify",
            "test-hooks",
            "test-github-actions",
            "test-interactive",
            "test-interactive-project",
            "clean-interactive-test",
            "clean",
            "status",
            "help",
        ],
        help="Action to perform",
    )

    parser.add_argument(
        "project_type",
        nargs="?",
        choices=["laravel", "symfony"],
        default="laravel",
        help="Type of project to create (default: laravel)",
    )

    parser.add_argument(
        "project_name",
        nargs="?",
        default="test-project",
        help="Name of the test project (default: test-project)",
    )

    parser.add_argument(
        "--target-dir",
        type=Path,
        help="Target directory for the test project (default: tests/<project_type>/<project_name>)",
    )

    parser.add_argument(
        "--automated",
        action="store_true",
        help="Run in automated mode (no manual input required). Only applies to interactive tests.",
    )

    args = parser.parse_args()

    # Determine paths
    script_dir = Path(__file__).parent.absolute()
    root_dir = script_dir.parent.parent

    # Set target directory
    if args.target_dir is None:
        target_dir = root_dir / "tests" / args.project_type / args.project_name
    else:
        target_dir = Path(args.target_dir)

    return Config(
        action=args.action,
        project_type=args.project_type,
        project_name=args.project_name,
        target_dir=target_dir,
        script_dir=script_dir,
        root_dir=root_dir,
        use_colors=os.getenv("NO_COLOR") is None,
        automated=args.automated,
    )


def main():
    """Main entry point"""
    try:
        config = create_config()
        orchestrator = TestOrchestrator(config)
        orchestrator.run_action(config.action)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
