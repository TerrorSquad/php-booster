#!/usr/bin/env python3
"""
Cleanup utilities for the PHP Booster integration tests
"""

import shutil

from .command_utils import CommandExecutor
from .config import Config
from .logger import Logger
from .state_detector import StateDetector


class EnvironmentCleaner:
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

    def clean_environment(self) -> None:
        """Clean up test environment."""
        self.log.info(f"Cleaning up test environment at {self.config.target_dir}")

        if self.config.target_dir.exists():
            if self.state.is_ddev_running():
                self.log.info("Stopping DDEV project...")
                try:
                    self.cmd.run_command(["ddev", "stop"], cwd=self.config.target_dir)
                    self.cmd.run_command(
                        ["ddev", "delete", "--omit-snapshot", "--yes"],
                        cwd=self.config.target_dir,
                        check=False,
                    )
                except:
                    pass

            self.log.info("Removing project directory...")
            shutil.rmtree(self.config.target_dir)
            self.log.success("Test environment cleaned up")
        else:
            self.log.info(f"No test environment found at {self.config.target_dir}")
