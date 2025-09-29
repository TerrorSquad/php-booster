#!/usr/bin/env python3
"""
Project setup utilities for the PHP Booster integration tests
"""

import sys

from .command_utils import CommandExecutor
from .config import Config
from .logger import Logger
from .state_detector import StateDetector


class ProjectSetup:
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

    def setup_project(self):
        """Set up the test project"""
        if self.state.is_project_created():
            self.log.warn(
                f"Project already exists at {self.config.target_dir}. Use 'setup-resume' to continue or 'clean' to start fresh."
            )
            sys.exit(1)

        self.log.info(f"Setting up {self.config.project_type} project...")
        
        # Create target directory
        self.config.target_dir.mkdir(parents=True, exist_ok=True)

        if self.config.project_type == "symfony":
            self._setup_symfony()
        elif self.config.project_type == "laravel":
            self._setup_laravel()
        else:
            self.log.error(f"Unknown project type: {self.config.project_type}")
            sys.exit(1)

        self.log.success(f"Project setup complete at {self.config.target_dir}")

    def _setup_symfony(self):
        """Set up Symfony project with DDEV"""
        self.log.info("Creating Symfony project using DDEV...")

        # Configure DDEV first
        self.log.info("Configuring DDEV for Symfony...")
        self.cmd.run_command(
            [
                "ddev",
                "config",
                f"--project-name={self.config.project_name}",
                "--project-type=php",
                "--docroot=public",
                "--create-docroot",
            ],
            cwd=self.config.target_dir,
        )

        # Start DDEV
        self.cmd.run_command(["ddev", "start"], cwd=self.config.target_dir)

        # Create project using DDEV composer
        self.cmd.run_command(
            [
                "ddev",
                "composer",
                "create-project",
                "symfony/skeleton:^7.0",
                ".",
                "--no-interaction",
                "--prefer-dist",
            ],
            cwd=self.config.target_dir,
        )

        # Add basic Symfony dependencies
        self.cmd.run_command(
            ["ddev", "composer", "require", "webapp", "--no-interaction"],
            cwd=self.config.target_dir,
        )

    def _setup_laravel(self):
        """Set up Laravel project with DDEV"""
        self.log.info("Creating Laravel project using DDEV...")

        # Configure DDEV first
        self.log.info("Configuring DDEV for Laravel...")
        self.cmd.run_command(
            [
                "ddev",
                "config",
                f"--project-name={self.config.project_name}",
                "--project-type=laravel",
                "--docroot=public",
            ],
            cwd=self.config.target_dir,
        )

        # Start DDEV
        self.cmd.run_command(["ddev", "start"], cwd=self.config.target_dir)

        # Create project using DDEV composer
        self.cmd.run_command(
            [
                "ddev",
                "composer",
                "create-project",
                "laravel/laravel:^11",
                ".",
                "--no-interaction",
                "--prefer-dist",
            ],
            cwd=self.config.target_dir,
        )

    def setup_resume(self):
        """Resume setup of an existing project"""
        if not self.state.is_project_created():
            self.log.error(
                f"No project found at {self.config.target_dir}. Run 'setup' first."
            )
            sys.exit(1)

        if self.state.is_ddev_running():
            self.log.info("DDEV is already running")
            return

        self.log.info("Resuming project setup...")
        self.log.info("Starting DDEV...")
        self.cmd.run_command(["ddev", "start"], cwd=self.config.target_dir)
        self.log.success("Project resumed successfully")
