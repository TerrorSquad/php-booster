#!/usr/bin/env python3
"""
State detection utilities for the PHP Booster integration tests
"""

from pathlib import Path
from typing import Optional

from .command_utils import CommandExecutor
from .config import Config
from .logger import Logger


class StateDetector:
    def __init__(
        self, config: Config, command_executor: CommandExecutor, logger: Logger
    ):
        self.config = config
        self.cmd = command_executor
        self.log = logger

    def is_project_created(self) -> bool:
        """Check if the project directory exists with composer.json"""
        return (
            self.config.target_dir.exists()
            and (self.config.target_dir / "composer.json").exists()
        )

    def is_ddev_running(self) -> bool:
        """Check if DDEV is running for this project"""
        if not self.config.target_dir.exists():
            return False

        try:
            result = self.cmd.run_command(
                ["ddev", "status"],
                cwd=self.config.target_dir,
                capture_output=True,
                check=False,
            )

            # DDEV is running if:
            # 1. Command succeeds (return code 0)
            # 2. Output contains service status indicators
            if result.returncode == 0:
                output = result.stdout.lower()
                # Look for positive indicators that DDEV is running
                running_indicators = [
                    "ok",  # Service status OK (with or without ANSI codes)
                    "running",
                    "healthy",
                    "project:",  # Project header indicates active project
                    "service",  # Service table header
                    "docker platform:",  # Indicates DDEV is managing containers
                ]
                return any(indicator in output for indicator in running_indicators)

            return False

        except Exception as e:
            print(f"DEBUG: Exception in is_ddev_running: {e}")
            return False

    def is_booster_integrated(self) -> bool:
        """Check if booster has been integrated"""
        # Primary check: version stamp file (most reliable indicator)
        version_stamp = self.config.target_dir / ".booster-version"
        if version_stamp.exists():
            return True

        # Fallback check: essential booster files (updated for TypeScript architecture)
        return (
            self.config.target_dir / ".husky/shared/utils.ts"
        ).exists() and (
            self.config.target_dir / ".husky/commit-msg.ts"
        ).exists()

    def get_integrated_version(self) -> Optional[str]:
        """Get the version of integrated booster"""
        version_file = self.config.target_dir / ".booster-version"
        if version_file.exists():
            try:
                return version_file.read_text().strip()
            except Exception:
                return None
        return None

    def has_git_hooks(self) -> bool:
        """Check if git hooks are installed"""
        hooks_dir = self.config.target_dir / ".git" / "hooks"
        if not hooks_dir.exists():
            return False

        # Check for the main hooks (both shell and TypeScript versions)
        expected_hooks = ["commit-msg", "pre-commit", "pre-push"]

        for hook in expected_hooks:
            hook_file = hooks_dir / hook
            if not hook_file.exists() or not hook_file.is_file():
                return False

        return True
