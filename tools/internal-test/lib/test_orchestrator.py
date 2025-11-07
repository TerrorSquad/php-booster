#!/usr/bin/env python3
"""
Main orchestrator for the PHP Booster integration tests
"""

import os
import sys
import subprocess
import shutil

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
        self.log.banner("🚀 Running Complete Test Suite 🚀")

        self.log.section("Environment Check")
        self.env_checker.check_environment()
        self.env_checker.check_requirements()

        self.log.section("Project Setup")
        self.project_setup.setup_project()

        self.log.section("Booster Integration")
        self.booster_integration.integrate_booster()

        self.log.section("Integration Verification")
        self.verifier.verify_integration()

        self.log.section("Hook Testing")
        self.hook_tester.test_branch_validation()

        print("")
        print("═══════════════════════════════════════════════════════════════")
        self.log.success(f"Test completed successfully!")
        print("═══════════════════════════════════════════════════════════════")
        print("")
        self.log.info(f"Project is available at: {self.config.target_dir}")
        print("")
        self.log.info("Next steps:")
        print("")
        self.log.info(f"  1. To clean up: {sys.argv[0]} clean")
        self.log.info(f"  2. To stop DDEV: cd {self.config.target_dir} && ddev stop")
        print("")

    def _test_interactive_mode_standalone(self):
        """
        Test interactive mode without requiring a full project setup.
        This is a simplified version that tests only the interactive mode feature
        without the overhead of creating a full Laravel/Symfony project.
        """
        import subprocess
        import shutil

        self.log.banner("🧪 Standalone Interactive Mode Test 🧪")

        # Get the repository root directory
        root_dir = self.config.root_dir

        # Path to the booster integration script
        booster_script = root_dir / "booster" / "integrate_booster.sh"

        if not booster_script.exists():
            self.log.error(f"Booster script not found at: {booster_script}")
            return False

        self.log.info(f"Found booster script at: {booster_script}")

        # Create temporary test directory
        test_dir = root_dir / "tests" / "temp_interactive_test"
        if not test_dir.exists():
            self.log.info(f"Creating test directory: {test_dir}")
            test_dir.mkdir(parents=True, exist_ok=True)

        # Prepare simulated answers
        answers = [
            "y",  # Install all tools?
            "y",  # Use ticket IDs?
            "PRJ",  # Ticket prefix
            "",  # Use default commit footer
            "y",  # Install IDE settings?
            "y",  # Proceed with configuration?
        ]

        input_string = "\n".join(answers) + "\n"

        self.log.info(f"Running integration script with -I flag and simulated input")
        self.log.info(f"Working directory: {test_dir}")

        # Run the script with simulated input
        env = os.environ.copy()
        env["BOOSTER_LOCAL_DEV"] = "1"
        env["BOOSTER_LOCAL_PATH"] = str(root_dir / "booster")

        try:
            result = subprocess.run(
                [
                    "bash",
                    str(booster_script),
                    "-I",
                    "-v",
                ],  # Added -v for verbose output
                input=input_string,
                text=True,
                capture_output=True,
                cwd=test_dir,
                env=env,
            )

            # Print output summary
            if result.stdout:
                self.log.info("Integration script output (truncated):")
                for line in result.stdout.splitlines()[-20:]:  # Show last 20 lines
                    self.log.info(line)

            if result.stderr:
                self.log.warn("Integration script errors:")
                for line in result.stderr.splitlines():
                    self.log.warn(line)

            # Verify that the expected files were created
            expected_files = [
                "package.json",
                "commitlint.config.ts",
                "validate-branch-name.config.cjs",
                "pnpm-workspace.yaml",
                "ecs.php",
                "rector.php",
                "phpstan.neon.dist",
                "psalm.xml",
                ".editorconfig",
                ".booster-version",  # The actual version stamp filename
                "documentation/openapi.yml",
                "tools/git-hooks/hooks/commit-msg",
                "tools/git-hooks/shared/utils.ts",  # Correct extension is .ts
            ]

            missing_files = []
            for file in expected_files:
                file_path = test_dir / file
                if not file_path.exists():
                    missing_files.append(file)

            if missing_files:
                self.log.error(f"The following expected files were not created:")
                for file in missing_files:
                    self.log.error(f"  - {file}")
                return False

            # Validate ticket prefix in branch validation config
            branch_config_path = test_dir / "validate-branch-name.config.cjs"
            if branch_config_path.exists():
                with open(branch_config_path, "r") as f:
                    content = f.read()
                    if "PRJ-" not in content:
                        self.log.error(
                            f"Ticket prefix 'PRJ' not found in branch validation config!"
                        )
                        return False
                self.log.success(
                    "Branch validation config contains correct ticket prefix."
                )

            if result.returncode == 0:
                self.log.success("Standalone interactive test completed successfully!")
                return True
            else:
                self.log.error(
                    f"Standalone interactive test failed with exit code: {result.returncode}"
                )
                return False

        except Exception as e:
            self.log.error(f"Error during standalone test: {e}")
            return False

    def _test_interactive_mode_project(self, interactive=True):
        """
        Test the interactive mode with a real project.

        Args:
            interactive: If True, manual user input is required.
                        If False, uses automated mode with default options.
        """
        # Check if project exists
        if not self.state.is_project_created():
            self.log.error("Project not found. Please run setup first:")
            self.log.info(
                f"  python test-integration.py setup {self.config.project_type} {self.config.project_name}"
            )
            return False

        if not self.state.is_ddev_running():
            self.log.error("DDEV not running. Please start it first:")
            self.log.info(f"  cd {self.config.target_dir} && ddev start")
            return False

        self.log.info("Project found and DDEV is running")

        # Create integration handler
        integration = self.booster_integration

        self.log.info("")
        if interactive:
            self.log.info("Running in INTERACTIVE mode...")
            self.log.info("")
            self.log.warn("⚠️  You will be prompted for configuration options")
            self.log.info("")
            input("Press Enter to continue...")
            # Run the integration with interactive mode
            result = integration.integrate_booster(interactive_mode=True)
        else:
            self.log.info("Running in AUTOMATED mode...")
            self.log.info("")
            # Run the integration with non-interactive mode
            result = integration.integrate_booster(interactive_mode=False)

        if result:
            self.log.success("✅ Interactive mode test completed successfully!")
            return True
        else:
            self.log.error("❌ Interactive mode test failed!")
            return False

    def _clean_interactive_test(self):
        """Clean up temporary test directory created for interactive tests"""
        import shutil

        test_dir = self.config.root_dir / "tests" / "temp_interactive_test"
        if test_dir.exists():
            try:
                shutil.rmtree(test_dir)
                self.log.success("Test directory cleaned up successfully.")
                return True
            except Exception as e:
                self.log.error(f"Error cleaning up test directory: {e}")
                return False
        else:
            self.log.warn("No test directory found. Nothing to clean up.")
            return True

    def _test_interactive_mode(self, mode: str = "standalone", automated: bool = False):
        """
        Run the interactive mode test with the specified mode.

        Args:
            mode: The test mode to use ('standalone' or 'project')
            automated: Whether to run in automated mode (no manual input required)
                      Only applies to project mode
        """
        self.log.info("Running interactive mode test...")

        if mode == "standalone":
            return self._test_interactive_mode_standalone()
        elif mode == "project":
            return self._test_interactive_mode_project(not automated)
        elif mode == "clean":
            return self._clean_interactive_test()
        else:
            self.log.error(f"Unknown test mode: {mode}")
            return False

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
            "test-interactive": lambda: (
                self.env_checker.check_environment(),
                self.env_checker.check_requirements(),
                self._test_interactive_mode("standalone"),
            ),
            "test-interactive-project": lambda: (
                self.env_checker.check_environment(),
                self.env_checker.check_requirements(),
                self._test_interactive_mode("project", self.config.automated),
            ),
            "clean-interactive-test": lambda: (self._test_interactive_mode("clean"),),
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
