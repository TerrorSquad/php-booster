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

    def integrate_booster(self, interactive_mode: bool = False) -> bool:
        """Integrate the PHP Booster
        
        Args:
            interactive_mode: If True, run in interactive mode (requires manual input)
                             If False, run in automated mode (default)
        
        Returns:
            bool: True if integration was successful, False otherwise
        """
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

        mode_msg = "interactive" if interactive_mode else "automated"
        self.log.info(f"Integrating PHP Booster in {mode_msg} mode...")
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

        # Build command with appropriate flags
        cmd = ["bash", str(local_script)]
        if interactive_mode:
            cmd.append("-I")
            self.log.info("Interactive mode enabled - you will be prompted for configuration")
        else:
            # Use non-interactive mode for automated testing
            cmd.append("-N")

        try:
            self.cmd.run_command(cmd, cwd=self.config.target_dir, env=env)
            self.log.success("Booster integration complete")
            return True
        except Exception as e:
            self.log.error(f"Integration failed: {str(e)}")
            return False
