#!/usr/bin/env python3
"""
Environment checking and requirements validation for the PHP Booster integration tests
"""

import os
import sys
from typing import List

from .command_utils import CommandExecutor
from .config import Config
from .logger import Logger


class EnvironmentChecker:
    def __init__(
        self, config: Config, command_executor: CommandExecutor, logger: Logger
    ):
        self.config = config
        self.cmd = command_executor
        self.log = logger

    def check_environment(self):
        """Check and display environment information"""
        self.log.info("Environment information:")
        print(f"  - OS: {os.uname().sysname}")
        try:
            with open("/etc/os-release") as f:
                for line in f:
                    if line.startswith("PRETTY_NAME"):
                        distro_name = line.split("=", 1)[1].strip('"\\n')
                        print(f"  - Distribution: {distro_name}")
                        break
        except:
            print("  - Distribution: Unknown")
        print(f"  - Shell: {os.environ.get('SHELL', 'Unknown')}")
        print(f"  - User: {os.environ.get('USER', 'Unknown')}")
        print(f"  - Working directory: {os.getcwd()}")
        # PATH is usually too long and not very useful for debugging
        # print(f"  - PATH: {os.environ.get('PATH', 'Unknown')}")

    def check_requirements(self):
        """Check system requirements"""
        self.log.info("Checking requirements...")

        # Check for required commands (composer is available via DDEV)
        required_commands = ["ddev", "git"]
        missing_commands: List[str] = []

        for cmd in required_commands:
            if self.cmd.check_command_exists(cmd):
                self.log.info(f"✓ {cmd} is available")
            else:
                missing_commands.append(cmd)
                self.log.error(f"✗ {cmd} is missing")

        # Check for composer (optional on host, available via DDEV)
        if self.cmd.check_command_exists("composer"):
            self.log.info("✓ composer is available (host)")
        else:
            self.log.info("ℹ composer not found on host (will use DDEV composer)")

        if missing_commands:
            self.log.error(f"Missing required commands: {', '.join(missing_commands)}")
            self.log.error("Please install the missing commands and try again.")
            sys.exit(1)

        # Check Docker (needed for DDEV)
        try:
            result = self.cmd.run_command(
                ["docker", "version"], capture_output=True, check=False
            )
            if result.returncode == 0:
                self.log.info("✓ Docker is available")
            else:
                self.log.error("✗ Docker not working")
                sys.exit(1)
        except Exception:
            self.log.error("✗ Docker not available")
            sys.exit(1)

        # Check DDEV version
        try:
            result = self.cmd.run_command(["ddev", "version"], capture_output=True)
            # Extract just the version number, not the full output
            version_output = result.stdout.strip()
            if "ddev version" in version_output.lower():
                # Parse the version from lines like "ddev version v1.21.4"
                for line in version_output.split("\n"):
                    if "ddev version" in line.lower():
                        self.log.info(f"✓ {line.strip()}")
                        break
            else:
                self.log.info("✓ DDEV is available")
        except Exception:
            self.log.error("✗ Cannot determine DDEV version")
            sys.exit(1)

        # Check if running in CI
        if os.getenv("CI"):
            self.log.info("Running in CI environment")
            # Additional CI-specific checks could go here

        self.log.success("All requirements satisfied")
