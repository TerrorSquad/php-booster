#!/usr/bin/env python3
"""
Verification utilities for the PHP Booster integration tests
"""

import json
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
            "renovate.json",
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

        # Verify renovate.json content
        self._verify_renovate_config()

        self.log.success("Integration verification passed!")

    def _verify_renovate_config(self):
        """Verify renovate.json has the expected configuration"""
        renovate_path = self.config.target_dir / "renovate.json"
        
        if not renovate_path.exists():
            self.log.error("renovate.json not found")
            sys.exit(1)
        
        try:
            with open(renovate_path, 'r') as f:
                config = json.load(f)
            
            # Check essential properties
            if "$schema" not in config:
                self.log.warn("renovate.json missing $schema property")
            
            if "extends" not in config or "config:base" not in config.get("extends", []):
                self.log.warn("renovate.json missing or invalid extends configuration")
            
            if "packageRules" not in config or not isinstance(config["packageRules"], list):
                self.log.warn("renovate.json missing or invalid packageRules")
            else:
                # Verify key package rules exist
                rules = config["packageRules"]
                
                # Check for automerge rule
                has_automerge = any(
                    "automerge" in rule and 
                    "matchUpdateTypes" in rule and
                    "minor" in rule.get("matchUpdateTypes", [])
                    for rule in rules
                )
                if not has_automerge:
                    self.log.warn("renovate.json missing automerge rule for minor/patch updates")
                
                # Check for dev dependencies grouping
                has_dev_deps = any(
                    "matchDepTypes" in rule and 
                    "devDependencies" in rule.get("matchDepTypes", [])
                    for rule in rules
                )
                if not has_dev_deps:
                    self.log.warn("renovate.json missing dev dependencies grouping")
                
                # Check for PHP dependencies grouping
                has_php_deps = any(
                    "matchPackagePatterns" in rule and
                    "groupName" in rule and
                    rule["groupName"] == "PHP dependencies"
                    for rule in rules
                )
                if not has_php_deps:
                    self.log.warn("renovate.json missing PHP dependencies grouping")
            
            self.log.success("renovate.json configuration verified")
            
        except json.JSONDecodeError as e:
            self.log.error(f"renovate.json is not valid JSON: {e}")
            sys.exit(1)
        except Exception as e:
            self.log.error(f"Failed to verify renovate.json: {e}")
            sys.exit(1)
