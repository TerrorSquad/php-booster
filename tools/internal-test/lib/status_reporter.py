#!/usr/bin/env python3
"""
Status reporting utilities for the PHP Booster integration tests
"""

from .config import Config
from .logger import Logger
from .state_detector import StateDetector


class StatusReporter:
    def __init__(self, config: Config, state_detector: StateDetector, logger: Logger):
        self.config = config
        self.state = state_detector
        self.log = logger

    def show_status(self):
        """Display current test environment status"""
        self.log.info(f"Test environment status for {self.config.project_name}:")
        print(f"  - Project type: {self.config.project_type}")
        print(f"  - Target directory: {self.config.target_dir}")
        print(f"  - Project exists: {'✓' if self.state.is_project_created() else '✗'}")
        print(f"  - DDEV running: {'✓' if self.state.is_ddev_running() else '✗'}")
        print(
            f"  - Booster integrated: {'✓' if self.state.is_booster_integrated() else '✗'}"
        )

        # Show booster version if integrated
        version = self.state.get_integrated_version()
        if version:
            print(f"  - Booster version: {version}")

        print(f"  - Git hooks installed: {'✓' if self.state.has_git_hooks() else '✗'}")

        # Additional status information
        if self.state.is_project_created():
            composer_json = self.config.target_dir / "composer.json"
            if composer_json.exists():
                print(f"  - Composer.json: ✓")
            else:
                print(f"  - Composer.json: ✗")
