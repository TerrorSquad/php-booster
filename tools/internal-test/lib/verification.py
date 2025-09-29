#!/usr/bin/env python3
"""
Verification utilities for the PHP Booster integration tests
"""

import sys
from typing import List

from .command_utils import CommandExecutor
from .config import Config
from .logger import Logger
from .state_detector import StateDetector


class IntegrationVerifier:
    def __init__(
        self,
        config: Config,
        command_executor: CommandExecutor,
        state_detector: StateDetector,
        logger: Logger,
    ):
        self.config = config
        self.cmd = command_executor
        self.state = state_detector
        self.log = logger

    def verify_integration(self):
        """Verify the booster integration"""
        if not self.state.is_project_created():
            self.log.error(
                f"No project found at {self.config.target_dir}. Run 'setup' first."
            )
            sys.exit(1)

        if not self.state.is_ddev_running():
            self.log.error("DDEV not running. Run 'setup-resume' first.")
            sys.exit(1)

        self.log.info("Verifying integration...")

        # Check expected files
        expected_files = [
            "tools/git-hooks/hooks/commit-msg",
            "tools/git-hooks/hooks/pre-commit",
            "tools/git-hooks/hooks/pre-push",
            "tools/git-hooks/hooks/commit-msg.ts",
            "tools/git-hooks/hooks/pre-commit.ts",
            "tools/git-hooks/hooks/pre-push.ts",
            "tools/git-hooks/shared/utils.ts",
            "validate-branch-name.config.cjs",
            "package.json",
        ]

        missing_files: List[str] = []
        for file_path in expected_files:
            if not (self.config.target_dir / file_path).exists():
                missing_files.append(file_path)

        if missing_files:
            self.log.warn(f"Missing expected files: {', '.join(missing_files)}")
            self.log.error(
                "Some expected files are missing. Integration may be incomplete."
            )
            sys.exit(1)

        # Check composer tools
        self.log.info("Checking composer packages and tools...")
        result = self.cmd.run_command(
            ["ddev", "composer", "show"],
            cwd=self.config.target_dir,
            capture_output=True,
        )
        package_lines = result.stdout.strip().split("\n")[:10]
        for line in package_lines:
            print(f"  {line}")
        self.log.info("... (showing first 10 packages)")

        # Test ECS
        try:
            self.cmd.run_command(
                ["ddev", "composer", "ecs", "--version"],
                cwd=self.config.target_dir,
                capture_output=True,
            )
            self.log.success("ECS is working through DDEV")
        except:
            self.log.error("ECS command not working through DDEV")
            sys.exit(1)

        # Check PHP version
        result = self.cmd.run_command(
            ["ddev", "exec", "php", "-v"],
            cwd=self.config.target_dir,
            capture_output=True,
        )
        php_version = result.stdout.strip().split("\n")[0]
        self.log.info(f"PHP version in DDEV: {php_version}")

        self.log.success("Integration verification passed!")
