#!/usr/bin/env python3
"""
Project setup utilities for the PHP Booster integration tests
"""

import os
import shutil
import sys
from datetime import datetime

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

    def setup_project(self) -> None:
        """
        Set up the test project.
        Tries to use cached fixture first, then creates fresh project if needed.
        After creation, automatically caches for future runs.
        Exits with code 1 if project already exists or type is unknown.
        """
        if self.state.is_project_created():
            self.log.warn(
                f"Project already exists at {self.config.target_dir}. Use 'setup-resume' to continue or 'clean' to start fresh."
            )
            sys.exit(1)

        self.log.info(f"Setting up {self.config.project_type} project...")

        # Create target directory
        self.config.target_dir.mkdir(parents=True, exist_ok=True)

        # Try to use cached fixture first
        if self._try_use_cached_fixture(self.config.project_type):
            self.log.success(f"Project setup complete at {self.config.target_dir} (from cache)")
            return

        # Create new project if cache not available
        if self.config.project_type == "symfony":
            self._create_symfony_project()
        elif self.config.project_type == "laravel":
            self._create_laravel_project()
        else:
            self.log.error(f"Unknown project type: {self.config.project_type}")
            sys.exit(1)

        # Cache the newly created project for future runs
        self._cache_fixture_after_setup(self.config.project_type)

        self.log.success(f"Project setup complete at {self.config.target_dir}")

    def _get_fixtures_cache_dir(self):
        """Get the path to the fixtures cache directory"""
        return self.config.root_dir / "tests" / ".fixtures-cache"

    def _ensure_fixtures_cache(self, project_type: str):
        """Check if fixtures cache is available (built by CI)"""
        fixtures_cache = self._get_fixtures_cache_dir()
        fixture_dir = fixtures_cache / project_type

        # Check if we have the fixture cached (built by CI workflow)
        if fixture_dir.exists():
            self.log.info(f"Using cached {project_type} fixture")
            # Check if fixture has a version file
            version_file = fixture_dir / "FIXTURE_VERSION"
            if version_file.exists():
                version = version_file.read_text().strip()
                self.log.info(f"Fixture version: {version}")
            return True

        # No cached fixtures available
        self.log.info(f"No cached {project_type} fixture found")
        return False

    def _try_use_cached_fixture(self, project_type: str) -> bool:
        """
        Try to use cached fixture. Returns True if successful, False if not available.
        If cache exists, sets up DDEV and runs composer install.
        """
        cache_source = self._get_fixtures_cache_dir() / project_type

        if not cache_source.exists():
            return False

        self.log.info(f"Using cached {project_type} fixture...")

        # Copy from cache
        for item in cache_source.iterdir():
            dest = self.config.target_dir / item.name
            if item.is_dir():
                shutil.copytree(item, dest)
            else:
                shutil.copy2(item, dest)

        # Configure git
        self.log.info("Configuring Git for test environment...")
        self.cmd.run_command(
            ["git", "config", "user.name", "Test User"], cwd=self.config.target_dir
        )
        self.cmd.run_command(
            ["git", "config", "user.email", "test@example.com"],
            cwd=self.config.target_dir,
        )

        # Configure DDEV based on project type
        if project_type == "symfony":
            self.log.info("Configuring DDEV for Symfony...")
            self.cmd.run_command(
                [
                    "ddev",
                    "config",
                    f"--project-name={self.config.project_name}",
                    "--project-type=php",
                    "--docroot=public",
                ],
                cwd=self.config.target_dir,
            )
        else:  # laravel
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
        self.log.info("Starting DDEV...")
        self.cmd.run_command(["ddev", "start"], cwd=self.config.target_dir)

        # Run composer install to ensure everything is up to date
        # This is fast since we already have vendor/ and lock files
        self.log.info("Running composer install (using cached dependencies)...")
        self.cmd.run_command(
            ["ddev", "composer", "install", "--no-interaction"],
            cwd=self.config.target_dir,
        )

        self.log.success(f"{project_type.capitalize()} fixture loaded from cache!")
        return True

    def _cache_fixture_after_setup(self, project_type: str) -> None:
        """Cache the project after initial setup for future test runs"""
        cache_dir = self._get_fixtures_cache_dir() / project_type

        if cache_dir.exists():
            self.log.info(f"Cache already exists at {cache_dir}, skipping...")
            return

        self.log.info(f"Caching {project_type} fixture for future runs...")
        cache_dir.mkdir(parents=True, exist_ok=True)

        # Copy project directory to cache
        for item in self.config.target_dir.iterdir():
            dest = cache_dir / item.name
            if item.is_dir():
                shutil.copytree(item, dest)
            else:
                shutil.copy2(item, dest)

        # Create version file with current date
        version_file = cache_dir / "FIXTURE_VERSION"
        version_file.write_text(datetime.now().strftime("%Y-%m-%d"))

        self.log.success(f"Cached {project_type} fixture at {cache_dir}")

    def _create_symfony_project(self) -> None:
        """Set up Symfony project using composer create-project via DDEV"""
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
        # Note: We use ddev composer here because it handles the initial project creation
        # and volume mounting better than raw docker exec for create-project
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
        # Use docker exec for performance
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"

        self.cmd.run_command(
            [
                "docker",
                "exec",
                "-t",
                f"ddev-{self.config.project_name}-web",
                "composer",
                "require",
                "webapp",
                "--no-interaction",
            ],
            cwd=self.config.target_dir,
            env=env,
        )

        # Initialize git repository
        self.log.info("Initializing git repository...")
        self.cmd.run_command(["git", "init", "-b", "main"], cwd=self.config.target_dir)

        # Set git user for the repository (required for commits)
        self.cmd.run_command(
            ["git", "config", "user.name", "Test User"], cwd=self.config.target_dir
        )
        self.cmd.run_command(
            ["git", "config", "user.email", "test@example.com"],
            cwd=self.config.target_dir,
        )

        # Add all files and create initial commit
        self.cmd.run_command(["git", "add", "."], cwd=self.config.target_dir)
        self.cmd.run_command(
            ["git", "commit", "-m", "feat: initial commit with symfony framework"],
            cwd=self.config.target_dir,
        )

    def _create_laravel_project(self):
        """Set up Laravel project using composer create-project via DDEV"""
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
        # Note: We use ddev composer here because it handles the initial project creation
        # and volume mounting better than raw docker exec for create-project
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

        # Initialize git repository
        self.log.info("Initializing git repository...")
        self.cmd.run_command(["git", "init", "-b", "main"], cwd=self.config.target_dir)

        # Set git user for the repository (required for commits)
        self.cmd.run_command(
            ["git", "config", "user.name", "Test User"], cwd=self.config.target_dir
        )
        self.cmd.run_command(
            ["git", "config", "user.email", "test@example.com"],
            cwd=self.config.target_dir,
        )

        # Add all files and create initial commit
        self.cmd.run_command(["git", "add", "."], cwd=self.config.target_dir)
        self.cmd.run_command(
            ["git", "commit", "-m", "feat: initial commit with laravel framework"],
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
