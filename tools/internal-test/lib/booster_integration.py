#!/usr/bin/env python3
"""
Booster integration utilities for the PHP Booster integration tests
"""

import os
import sys
from pathlib import Path

from .command_utils import CommandExecutor
from .config import Config
from .logger import Logger
from .state_detector import StateDetector


class BoosterIntegration:
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

    def integrate_booster(self):
        """Integrate the PHP Booster"""
        if not self.state.is_project_created():
            self.log.error(
                f"No project found at {self.config.target_dir}. Run 'setup' first."
            )
            sys.exit(1)

        if not self.state.is_ddev_running():
            self.log.error("DDEV not running. Run 'setup-resume' first.")
            sys.exit(1)

        if self.state.is_booster_integrated():
            self.log.warn(
                "Booster already appears to be integrated. Continuing anyway..."
            )

        self.log.info("Integrating PHP Booster...")
        self.log.info("Using local integration script for testing")

        # Use local integration script with local development mode
        local_script = (
            Path(__file__).parent.parent.parent.parent
            / "booster"
            / "integrate_booster.sh"
        )
        local_booster = Path(__file__).parent.parent.parent.parent / "booster"

        env = os.environ.copy()
        env["BOOSTER_LOCAL_DEV"] = "1"
        env["BOOSTER_LOCAL_PATH"] = str(local_booster)

        self.cmd.run_command(
            ["bash", str(local_script)], cwd=self.config.target_dir, env=env
        )

        self.log.success("Booster integration complete")
