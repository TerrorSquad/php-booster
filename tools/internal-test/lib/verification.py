#!/usr/bin/env python3
"""
Verification utilities for the PHP Booster integration tests
"""

import os
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

    def verify_integration(self) -> None:
        """
        Verify the booster integration.
        Exits with code 1 if verification fails.
        """
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
            ".husky/commit-msg",
            ".husky/pre-commit",
            ".husky/pre-push",
            ".husky/commit-msg.ts",
            ".husky/pre-commit.ts",
            ".husky/pre-push.ts",
            ".husky/shared/index.ts",
            "validate-branch-name.config.cjs",
            "package.json",
            "renovate.json",
            "deptrac.yaml",
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


        # Test ECS
        try:
            # Use docker exec for performance
            env = os.environ.copy()
            env["TERM"] = "xterm-256color"

            self.cmd.run_command(
                [
                    "docker",
                    "exec",
                    "-t",
                    f"ddev-{self.config.project_name}-web",
                    "vendor/bin/ecs",
                    "--version",
                ],
                cwd=self.config.target_dir,
                capture_output=True,
                env=env,  # Ensure colors are preserved
            )
            self.log.success("ECS is working through DDEV")
        except Exception as e:
            self.log.error(f"ECS command not working through DDEV: {e}")
            sys.exit(1)

        # Check PHP version
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"

        result = self.cmd.run_command(
            [
                "docker",
                "exec",
                "-t",
                f"ddev-{self.config.project_name}-web",
                "php",
                "-v",
            ],
            cwd=self.config.target_dir,
            capture_output=True,
            env=env,  # Ensure colors are preserved
        )
        # Clean up output to remove potential carriage returns from docker exec
        php_version = result.stdout.strip().split("\n")[0].replace("\r", "")
        self.log.info(f"PHP version in DDEV: {php_version}")

        self.log.success("Integration verification passed!")
