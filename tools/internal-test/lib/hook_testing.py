#!/usr/bin/env python3
"""
Git hook testing utilities for the PHP Booster integration tests
"""

import os
import subprocess
import sys

from .command_utils import CommandExecutor
from .config import Config
from .logger import Logger
from .state_detector import StateDetector


class HookTester:
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

    def test_branch_validation(self):
        """Test git hooks and branch validation"""
        if (
            not self.state.is_project_created()
            or not self.state.is_booster_integrated()
        ):
            self.log.error(
                "Project not set up or booster not integrated. Run previous steps first."
            )
            sys.exit(1)

        self.log.info("Testing branch validation...")

        # Return to main/master first
        try:
            self.cmd.run_command(
                ["git", "checkout", "master"], cwd=self.config.target_dir, check=False
            )
        except:
            try:
                self.cmd.run_command(
                    ["git", "checkout", "main"],
                    cwd=self.config.target_dir,
                    check=False,
                )
            except:
                pass

        # Clean up existing test branches
        for branch in ["feature/PRJ-123-test-feature", "invalid-branch-format"]:
            try:
                self.cmd.run_command(
                    ["git", "branch", "-D", branch],
                    cwd=self.config.target_dir,
                    check=False,
                )
            except:
                pass

        # Test valid branch
        self._test_valid_branch()

        # Return to main branch before testing invalid branch
        try:
            self.cmd.run_command(
                ["git", "checkout", "main"], cwd=self.config.target_dir, check=False
            )
        except:
            try:
                self.cmd.run_command(
                    ["git", "checkout", "master"],
                    cwd=self.config.target_dir,
                    check=False,
                )
            except:
                pass

        # Test invalid branch
        self._test_invalid_branch()

        # Return to main branch
        try:
            self.cmd.run_command(
                ["git", "checkout", "main"], cwd=self.config.target_dir, check=False
            )
        except:
            try:
                self.cmd.run_command(
                    ["git", "checkout", "master"],
                    cwd=self.config.target_dir,
                    check=False,
                )
            except:
                pass

    def _test_valid_branch(self):
        """Test valid branch and commit"""
        self.cmd.run_command(
            ["git", "checkout", "-b", "feature/PRJ-123-test-feature"],
            cwd=self.config.target_dir,
        )

        # Create test PHP file
        test_file = self.config.target_dir / "test_commit.php"
        test_file.write_text(
            """<?php
// Test commit file for integration testing
echo "Hello, World!";
"""
        )

        self.log.info(f"Created test file: {test_file}")
        self.log.info("File contents:")
        print(test_file.read_text())

        self.cmd.run_command(
            ["git", "add", "test_commit.php"], cwd=self.config.target_dir
        )

        # Set environment to skip static analysis for faster testing
        env = os.environ.copy()
        env["SKIP_PHPSTAN"] = "1"
        env["SKIP_PSALM"] = "1"

        try:
            self.cmd.run_command(
                ["git", "commit", "-m", "feat: add test feature"],
                cwd=self.config.target_dir,
                env=env,
            )

            self.log.success("Valid branch + commit message accepted")

            # Check commit log
            result = self.cmd.run_command(
                ["git", "log", "-1", "--pretty=format:%h %s"],
                cwd=self.config.target_dir,
                capture_output=True,
            )
            self.log.info(f"Commit: {result.stdout}")

            # Check if ticket footer was appended
            result = self.cmd.run_command(
                ["git", "log", "-1", "--pretty=%B"],
                cwd=self.config.target_dir,
                capture_output=True,
            )

            if "Closes: PRJ-123" in result.stdout:
                self.log.success("Ticket footer correctly appended")
            else:
                self.log.error("Ticket footer not appended to commit message")
                sys.exit(1)

        except subprocess.CalledProcessError:
            self.log.error("Commit on valid branch failed")
            sys.exit(1)

    def _test_invalid_branch(self):
        """Test invalid branch rejection"""
        self.cmd.run_command(
            ["git", "checkout", "-b", "invalid-branch-format"],
            cwd=self.config.target_dir,
        )

        # Create another test file
        test_file = self.config.target_dir / "test_commit2.php"
        test_file.write_text(
            """<?php
// Another test commit file
echo "Another test";
"""
        )

        self.cmd.run_command(
            ["git", "add", "test_commit2.php"], cwd=self.config.target_dir
        )

        # Set environment to skip static analysis and test branch validation
        env = os.environ.copy()
        env["SKIP_PHPSTAN"] = "1"
        env["SKIP_PSALM"] = "1"

        # This should fail due to invalid branch name
        result = self.cmd.run_command(
            ["git", "commit", "-m", "add another test"],
            cwd=self.config.target_dir,
            check=False,
            capture_output=True,
            env=env,
        )

        if result.returncode == 0:
            self.log.error("Invalid branch incorrectly accepted")
            sys.exit(1)
        else:
            self.log.success("Invalid branch correctly rejected")

    def test_github_actions(self):
        """Test GitHub Actions auto-fix workflows"""
        if (
            not self.state.is_project_created()
            or not self.state.is_booster_integrated()
        ):
            self.log.error(
                "Project not set up or booster not integrated. Run previous steps first."
            )
            sys.exit(1)

        self.log.info("Testing GitHub Actions auto-fix integration...")

        # Check if GitHub Actions workflows were copied
        workflows_dir = self.config.target_dir / ".github" / "workflows"
        actions_dir = self.config.target_dir / ".github" / "actions" / "php-auto-fix"

        if not workflows_dir.exists():
            self.log.error("GitHub Actions workflows directory not found")
            sys.exit(1)

        if not actions_dir.exists():
            self.log.error("GitHub Actions php-auto-fix action directory not found")
            sys.exit(1)

        # Check for required workflow files
        required_workflows = ["php-auto-fix-simple.yml"]

        for workflow in required_workflows:
            workflow_file = workflows_dir / workflow
            if not workflow_file.exists():
                self.log.error(f"Required workflow file missing: {workflow}")
                sys.exit(1)
            else:
                self.log.success(f"Found workflow: {workflow}")

        # Check for action.yml in the reusable action
        action_file = actions_dir / "action.yml"
        if not action_file.exists():
            self.log.error("Reusable action.yml file missing")
            sys.exit(1)
        else:
            self.log.success("Found reusable action.yml")

        # Validate workflow syntax (basic YAML validation)
        try:
            import yaml
        except ImportError:
            self.log.warn("PyYAML not installed, skipping YAML syntax validation")
            return

        for workflow in required_workflows:
            workflow_file = workflows_dir / workflow
            try:
                with open(workflow_file, "r") as f:
                    yaml.safe_load(f)
                self.log.success(f"Workflow {workflow} has valid YAML syntax")
            except yaml.YAMLError as e:
                self.log.error(f"Workflow {workflow} has invalid YAML: {e}")
                sys.exit(1)

        # Validate action.yml syntax
        try:
            with open(action_file, "r") as f:
                yaml.safe_load(f)
            self.log.success("Reusable action has valid YAML syntax")
        except yaml.YAMLError as e:
            self.log.error(f"Reusable action has invalid YAML: {e}")
            sys.exit(1)

        # Check if workflows contain expected triggers and jobs
        self._validate_workflow_content()

        self.log.success("All GitHub Actions auto-fix tests passed!")

    def _validate_workflow_content(self):
        """Validate that workflows contain expected content"""
        workflows_dir = self.config.target_dir / ".github" / "workflows"

        # Check main workflow
        main_workflow = workflows_dir / "php-auto-fix-simple.yml"
        with open(main_workflow, "r") as f:
            content = f.read()

        # Validate key components exist
        required_content = [
            "on:",
            "push:",
            "pull_request:",
            "php-auto-fix:",
            "runs-on: ubuntu-latest",
            "Rector",
            "ECS",
            "composer install",
        ]

        for requirement in required_content:
            if requirement not in content:
                self.log.error(f"Main workflow missing required content: {requirement}")
                sys.exit(1)

        self.log.success("Main workflow contains all required components")

        # Check simple workflow
        simple_workflow = workflows_dir / "php-auto-fix-simple.yml"
        with open(simple_workflow, "r") as f:
            simple_content = f.read()

        if "./.github/actions/php-auto-fix" not in simple_content:
            self.log.error("Simple workflow doesn't use the reusable action")
            sys.exit(1)

        self.log.success("Simple workflow correctly uses reusable action")
