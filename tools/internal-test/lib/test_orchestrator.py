#!/usr/bin/env python3
"""
Main orchestrator for the PHP Booster integration tests
"""

import sys

from .booster_integration import BoosterIntegration
from .cleanup import EnvironmentCleaner
from .command_utils import CommandExecutor
from .config import Config
from .environment import EnvironmentChecker
from .hook_testing import HookTester
from .logger import Logger
from .project_setup import ProjectSetup
from .state_detector import StateDetector
from .status_reporter import StatusReporter
from .verification import IntegrationVerifier


class TestOrchestrator:
    """Main orchestrator class that coordinates all test components"""

    def __init__(self, config: Config):
        self.config = config

        # Core utilities
        self.log = Logger(config.use_colors)
        self.cmd = CommandExecutor(self.log)
        self.state = StateDetector(config, self.cmd, self.log)

        # Specialized components
        self.env_checker = EnvironmentChecker(config, self.cmd, self.log)
        self.project_setup = ProjectSetup(config, self.cmd, self.state, self.log)
        self.booster_integration = BoosterIntegration(
            config, self.cmd, self.state, self.log
        )
        self.verifier = IntegrationVerifier(config, self.cmd, self.state, self.log)
        self.hook_tester = HookTester(config, self.cmd, self.state, self.log)
        self.status_reporter = StatusReporter(config, self.state, self.log)
        self.cleaner = EnvironmentCleaner(config, self.cmd, self.state, self.log)

    def run_full_test(self):
        """Run the complete test suite"""
        self.env_checker.check_environment()
        self.env_checker.check_requirements()
        self.project_setup.setup_project()
        self.booster_integration.integrate_booster()
        self.verifier.verify_integration()
        self.hook_tester.test_branch_validation()
        self.hook_tester.test_github_actions()

        self.log.success(
            f"Test completed successfully! Project is available at: {self.config.target_dir}"
        )
        self.log.info(f"To clean up, run: {sys.argv[0]} clean")
        self.log.info(f"To stop DDEV: cd {self.config.target_dir} && ddev stop")

    def run_action(self, action: str):
        """Run a specific test action"""
        actions = {
            "full": self.run_full_test,
            "env-check": lambda: (
                self.env_checker.check_environment(),
                self.env_checker.check_requirements(),
            ),
            "setup": lambda: (
                self.env_checker.check_environment(),
                self.env_checker.check_requirements(),
                self.project_setup.setup_project(),
            ),
            "setup-resume": lambda: (
                self.env_checker.check_environment(),
                self.env_checker.check_requirements(),
                self.project_setup.setup_resume(),
            ),
            "integrate": lambda: (
                self.env_checker.check_environment(),
                self.env_checker.check_requirements(),
                self.booster_integration.integrate_booster(),
            ),
            "verify": lambda: (
                self.env_checker.check_environment(),
                self.env_checker.check_requirements(),
                self.verifier.verify_integration(),
            ),
            "test-hooks": lambda: (
                self.env_checker.check_environment(),
                self.env_checker.check_requirements(),
                self.hook_tester.test_branch_validation(),
            ),
            "test-github-actions": lambda: (
                self.env_checker.check_environment(),
                self.env_checker.check_requirements(),
                self.hook_tester.test_github_actions(),
            ),
            "clean": self.cleaner.clean_environment,
            "status": self.status_reporter.show_status,
            "help": lambda: print("Use --help for usage information"),
        }

        action_func = actions.get(action)
        if action_func:
            action_func()
        else:
            self.log.error(f"Unknown action: {action}")
            print("Use --help for usage information")
            sys.exit(1)
