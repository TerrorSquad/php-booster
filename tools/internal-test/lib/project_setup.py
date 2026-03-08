#!/usr/bin/env python3
"""
Project setup utilities for the PHP Booster integration tests
"""

import os
import shutil
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

    def setup_project(self) -> None:
        """
        Set up the test project.
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

        # Check if we should use fixtures (default: true)
        use_fixtures = os.getenv("USE_TEST_FIXTURES", "true").lower() == "true"

        if self.config.project_type == "symfony":
            if use_fixtures:
                self._setup_from_fixtures("symfony")
            else:
                self._setup_symfony_create_project()
        elif self.config.project_type == "laravel":
            if use_fixtures:
                self._setup_from_fixtures("laravel")
            else:
                self._setup_laravel_create_project()
        else:
            self.log.error(f"Unknown project type: {self.config.project_type}")
            sys.exit(1)

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
        self.log.info(f"No cached {project_type} fixture found (will be built by CI on first run)")
        return False

    def _setup_from_fixtures(self, project_type: str):
        """Set up project by copying from pre-built fixtures"""
        self.log.info(f"Setting up {project_type} from fixtures (fast mode)...")

        # Ensure we have the fixture (download from releases if needed)
        if not self._ensure_fixtures_cache(project_type):
            self.log.error(
                f"Failed to download {project_type} fixture. "
                "Falling back to create-project method..."
            )
            if project_type == "symfony":
                self._setup_symfony_create_project()
            else:
                self._setup_laravel_create_project()
            return

        # Get fixture source path
        fixtures_cache = self._get_fixtures_cache_dir()
        source = fixtures_cache / project_type

        if not source.exists():
            self.log.error(
                f"Fixture not found at {source} after download. "
                "Falling back to create-project method..."
            )
            if project_type == "symfony":
                self._setup_symfony_create_project()
            else:
                self._setup_laravel_create_project()
            return

        self.log.info(f"Copying {project_type} fixture from cache...")

        # Copy everything including .git directory
        for item in source.iterdir():
            dest = self.config.target_dir / item.name
            if item.is_dir():
                shutil.copytree(item, dest)
            else:
                shutil.copy2(item, dest)

        # Configure Git
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

        self.log.success(f"{project_type.capitalize()} fixture setup complete!")

    def _setup_symfony_create_project(self) -> None:
        """Set up Symfony project using composer create-project (legacy/fallback method)"""
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

    def _setup_laravel_create_project(self):
        """Set up Laravel project using composer create-project (legacy/fallback method)"""
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
