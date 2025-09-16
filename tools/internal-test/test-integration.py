#!/usr/bin/env python3
"""
Integration test script for PHP Booster
Creates a new project and integrates the booster to test end-to-end flow
"""

import argparse
import os
import sys
import subprocess
import json
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass
import shutil
import tempfile


@dataclass
class Config:
    action: str
    project_type: str
    project_name: str
    target_dir: Path
    script_dir: Path
    root_dir: Path
    use_colors: bool


class Colors:
    """ANSI color codes for terminal output"""

    BLUE = "\033[0;34m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[0;33m"
    RED = "\033[0;31m"
    RESET = "\033[0m"


class Logger:
    def __init__(self, use_colors: bool = True):
        self.use_colors = use_colors and os.getenv("NO_COLOR") is None

    def _color(self, color: str, message: str) -> str:
        if self.use_colors:
            return f"{color}[{message}]{Colors.RESET}"
        return f"[{message}]"

    def info(self, message: str):
        print(f"{self._color(Colors.BLUE, 'INFO')} {message}")

    def success(self, message: str):
        print(f"{self._color(Colors.GREEN, 'SUCCESS')} {message}")

    def warn(self, message: str):
        print(f"{self._color(Colors.YELLOW, 'WARNING')} {message}")

    def error(self, message: str):
        print(f"{self._color(Colors.RED, 'ERROR')} {message}", file=sys.stderr)


class TestEnvironment:
    def __init__(self, config: Config):
        self.config = config
        self.log = Logger(config.use_colors)

    def run_command(
        self,
        cmd: List[str],
        cwd: Optional[Path] = None,
        check: bool = True,
        capture_output: bool = False,
        env: Optional[dict] = None,
    ) -> subprocess.CompletedProcess:
        """Run a shell command with proper error handling"""
        try:
            return subprocess.run(
                cmd,
                cwd=cwd,
                check=check,
                capture_output=capture_output,
                text=True,
                env=env,
            )
        except subprocess.CalledProcessError as e:
            if not capture_output:
                self.log.error(f"Command failed: {' '.join(cmd)}")
                self.log.error(f"Exit code: {e.returncode}")
            raise

    def check_command_exists(self, command: str) -> bool:
        """Check if a command exists in PATH"""
        return shutil.which(command) is not None

    # State Detection Methods
    def is_project_created(self) -> bool:
        """Check if the project directory exists with composer.json"""
        return (
            self.config.target_dir.exists()
            and (self.config.target_dir / "composer.json").exists()
        )

    def is_ddev_running(self) -> bool:
        """Check if DDEV is running for this project"""
        if not self.config.target_dir.exists():
            return False

        try:
            result = self.run_command(
                ["ddev", "status"],
                cwd=self.config.target_dir,
                capture_output=True,
                check=False,
            )

            # DDEV is running if:
            # 1. Command succeeds (return code 0)
            # 2. Output contains service status indicators
            if result.returncode == 0:
                output = result.stdout.lower()
                # Look for positive indicators that DDEV is running
                running_indicators = [
                    "ok",  # Service status OK (with or without ANSI codes)
                    "running",
                    "healthy",
                    "project:",  # Project header indicates active project
                    "service",  # Service table header
                    "docker platform:",  # Indicates DDEV is managing containers
                ]
                return any(indicator in output for indicator in running_indicators)

            return False

        except Exception as e:
            print(f"DEBUG: Exception in is_ddev_running: {e}")
            return False

    def is_booster_integrated(self) -> bool:
        """Check if booster has been integrated"""
        # Primary check: version stamp file (most reliable indicator)
        version_stamp = self.config.target_dir / ".booster-version"
        if version_stamp.exists():
            return True

        # Fallback check: essential booster files (updated for ZX architecture)
        return (
            self.config.target_dir / "tools/git-hooks/shared/utils.mjs"
        ).exists() and (
            self.config.target_dir / "tools/git-hooks/hooks/commit-msg.mjs"
        ).exists()

    def get_integrated_version(self) -> Optional[str]:
        """Get the currently integrated booster version"""
        version_stamp = self.config.target_dir / ".booster-version"
        if version_stamp.exists():
            try:
                content = version_stamp.read_text()
                for line in content.splitlines():
                    if line.startswith("VERSION="):
                        return line.split("=", 1)[1]
            except Exception as e:
                self.log.warn(f"Failed to read version stamp: {e}")
        return None

    def has_git_hooks(self) -> bool:
        """Check if git hooks are installed"""
        # Check for the new ZX-based hook system with custom hooksPath
        zx_hooks_exist = (
            (self.config.target_dir / "tools/git-hooks/hooks/commit-msg").exists()
            and (self.config.target_dir / "tools/git-hooks/hooks/pre-commit").exists()
            and (
                self.config.target_dir / "tools/git-hooks/hooks/commit-msg.mjs"
            ).exists()
            and (
                self.config.target_dir / "tools/git-hooks/hooks/pre-commit.mjs"
            ).exists()
        )

        return zx_hooks_exist

    # Action Methods
    def show_status(self):
        """Show current status of test environment"""
        self.log.info(f"Test environment status for: {self.config.target_dir}")

        if self.is_project_created():
            self.log.success("✅ Project exists")
            try:
                composer_json = json.loads(
                    (self.config.target_dir / "composer.json").read_text()
                )
                project_name = composer_json.get("name", "Unknown")
                self.log.info(f"   Name: {project_name}")
            except:
                self.log.info("   Name: Unknown")
        else:
            self.log.warn("⚠️ Project not created")

        if self.is_ddev_running():
            self.log.success("✅ DDEV is running")
        else:
            self.log.warn("⚠️ DDEV not running")

        if self.is_booster_integrated():
            version = self.get_integrated_version()
            if version:
                self.log.success(f"✅ Booster integrated (version {version})")
            else:
                self.log.success("✅ Booster integrated")
        else:
            self.log.warn("⚠️ Booster not integrated")

        if self.has_git_hooks():
            self.log.success("✅ Git hooks installed")
        else:
            self.log.warn("⚠️ Git hooks not installed")

    def check_requirements(self):
        """Check if all required tools are available"""
        self.log.info("Checking requirements...")

        required_tools = ["git", "curl", "ddev"]
        missing_tools = []

        for tool in required_tools:
            if not self.check_command_exists(tool):
                missing_tools.append(tool)

        if missing_tools:
            self.log.error(f"Missing required tools: {', '.join(missing_tools)}")
            self.log.error("Please install them and try again.")
            sys.exit(1)

        # Check DDEV specifically
        try:
            result = self.run_command(["ddev", "--version"], capture_output=True)
            self.log.info(
                f"Using DDEV: {result.stdout.strip().split()[0]} {result.stdout.strip().split()[1]}"
            )
        except:
            self.log.error("DDEV is installed but not working properly.")
            sys.exit(1)

        self.log.success("All required tools are available")

    def setup_project(self):
        """Set up a new project (clean setup)"""
        self.log.info(
            f"Setting up {self.config.project_type} project in {self.config.target_dir}"
        )

        # Clean up existing project
        if self.config.target_dir.exists():
            try:
                if self.is_ddev_running():
                    self.log.info("Stopping existing DDEV project...")
                    self.run_command(["ddev", "stop"], cwd=self.config.target_dir)
            except:
                pass

            self.log.warn("Target directory already exists. Removing...")
            shutil.rmtree(self.config.target_dir)

        # Create project directory
        self.config.target_dir.mkdir(parents=True, exist_ok=True)

        # Setup based on project type
        if self.config.project_type == "symfony":
            self._setup_symfony()
        elif self.config.project_type == "laravel":
            self._setup_laravel()
        else:
            self.log.error(
                f"Project type '{self.config.project_type}' is not supported."
            )
            sys.exit(1)

        # Initialize Git
        self.log.info("Initializing git repository...")
        self.run_command(["git", "init"], cwd=self.config.target_dir)
        self.run_command(
            ["git", "config", "user.name", "Test User"], cwd=self.config.target_dir
        )
        self.run_command(
            ["git", "config", "user.email", "test@example.com"],
            cwd=self.config.target_dir,
        )

        # Initial commit
        self.run_command(["git", "add", "."], cwd=self.config.target_dir)
        self.run_command(
            [
                "git",
                "commit",
                "-m",
                f"feat: initial commit with {self.config.project_type} framework",
            ],
            cwd=self.config.target_dir,
        )

        self.log.success("Project and DDEV setup complete")

    def _setup_symfony(self):
        """Setup Symfony project"""
        self.log.info("Creating new Symfony project using DDEV...")
        self.run_command(
            [
                "ddev",
                "config",
                f"--project-name={self.config.project_name}",
                "--project-type=symfony",
                "--docroot=public",
            ],
            cwd=self.config.target_dir,
        )

        self.run_command(["ddev", "start"], cwd=self.config.target_dir)

        # Use Symfony LTS for better stability
        self.run_command(
            [
                "ddev",
                "composer",
                "create-project",
                "symfony/skeleton:^7.1",
                ".",
                "--no-interaction",
            ],
            cwd=self.config.target_dir,
        )

        # Add some basic packages
        self.run_command(
            [
                "ddev",
                "composer",
                "require",
                "symfony/webapp-pack",
                "--no-interaction",
            ],
            cwd=self.config.target_dir,
        )

    def _setup_laravel(self):
        """Setup Laravel project"""
        self.log.info("Creating new Laravel project using DDEV...")
        self.run_command(
            [
                "ddev",
                "config",
                f"--project-name={self.config.project_name}",
                "--project-type=laravel",
                "--docroot=public",
            ],
            cwd=self.config.target_dir,
        )

        self.run_command(["ddev", "start"], cwd=self.config.target_dir)
        self.run_command(
            [
                "ddev",
                "composer",
                "create-project",
                "laravel/laravel:^12",
                ".",
                "--no-interaction",
            ],
            cwd=self.config.target_dir,
        )

        self.run_command(
            ["ddev", "exec", "cp .env.example .env"], cwd=self.config.target_dir
        )
        self.run_command(
            ["ddev", "artisan", "key:generate"], cwd=self.config.target_dir
        )

    def setup_resume(self):
        """Resume setup for existing project"""
        if not self.is_project_created():
            self.log.error(
                f"No project found at {self.config.target_dir}. Use 'setup' to create a new one."
            )
            sys.exit(1)

        self.log.info(
            f"Resuming setup for existing project at {self.config.target_dir}"
        )

        if not self.is_ddev_running():
            self.log.info("Starting DDEV...")
            self.run_command(["ddev", "start"], cwd=self.config.target_dir)
        else:
            self.log.info("DDEV already running")

        self.log.success("Setup resumed successfully")

    def integrate_booster(self):
        """Integrate PHP Booster"""
        if not self.is_project_created():
            self.log.error(
                f"No project found at {self.config.target_dir}. Run 'setup' first."
            )
            sys.exit(1)

        if not self.is_ddev_running():
            self.log.error("DDEV not running. Run 'setup-resume' first.")
            sys.exit(1)

        if self.is_booster_integrated():
            self.log.warn(
                "Booster already appears to be integrated. Continuing anyway..."
            )

        self.log.info("Integrating PHP Booster...")
        self.log.info("Using local integration script for testing")

        # Use local integration script with local development mode
        local_script = (
            Path(__file__).parent.parent.parent / "booster" / "integrate_booster.sh"
        )
        local_booster = Path(__file__).parent.parent.parent / "booster"

        env = os.environ.copy()
        env["BOOSTER_LOCAL_DEV"] = "1"
        env["BOOSTER_LOCAL_PATH"] = str(local_booster)

        self.run_command(
            ["bash", str(local_script)], cwd=self.config.target_dir, env=env
        )

        self.log.success("Booster integration complete")

    def verify_integration(self):
        """Verify the booster integration"""
        if not self.is_project_created():
            self.log.error(
                f"No project found at {self.config.target_dir}. Run 'setup' first."
            )
            sys.exit(1)

        if not self.is_ddev_running():
            self.log.error("DDEV not running. Run 'setup-resume' first.")
            sys.exit(1)

        self.log.info("Verifying integration...")

        # Check expected files
        expected_files = [
            "tools/git-hooks/hooks/commit-msg",
            "tools/git-hooks/hooks/pre-commit",
            "tools/git-hooks/hooks/pre-push",
            "tools/git-hooks/hooks/commit-msg.mjs",
            "tools/git-hooks/hooks/pre-commit.mjs",
            "tools/git-hooks/hooks/pre-push.mjs",
            "tools/git-hooks/shared/utils.mjs",
            "validate-branch-name.config.cjs",
            "package.json",
        ]

        missing_files = []
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
        result = self.run_command(
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
            self.run_command(
                ["ddev", "composer", "ecs", "--version"],
                cwd=self.config.target_dir,
                capture_output=True,
            )
            self.log.success("ECS is working through DDEV")
        except:
            self.log.error("ECS command not working through DDEV")
            sys.exit(1)

        # Check PHP version
        result = self.run_command(
            ["ddev", "exec", "php", "-v"],
            cwd=self.config.target_dir,
            capture_output=True,
        )
        php_version = result.stdout.strip().split("\n")[0]
        self.log.info(f"PHP version in DDEV: {php_version}")

        self.log.success("Integration verification passed!")

    def test_branch_validation(self):
        """Test git hooks and branch validation"""
        if not self.is_project_created() or not self.is_booster_integrated():
            self.log.error(
                "Project not set up or booster not integrated. Run previous steps first."
            )
            sys.exit(1)

        self.log.info("Testing branch validation...")

        # Return to main/master first
        try:
            self.run_command(
                ["git", "checkout", "master"], cwd=self.config.target_dir, check=False
            )
        except:
            try:
                self.run_command(
                    ["git", "checkout", "master"],
                    cwd=self.config.target_dir,
                    check=False,
                )
            except:
                pass

        # Clean up existing test branches
        for branch in ["feature/PRJ-123-test-feature", "invalid-branch-format"]:
            try:
                self.run_command(
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
            self.run_command(
                ["git", "checkout", "main"], cwd=self.config.target_dir, check=False
            )
        except:
            try:
                self.run_command(
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
            self.run_command(
                ["git", "checkout", "main"], cwd=self.config.target_dir, check=False
            )
        except:
            try:
                self.run_command(
                    ["git", "checkout", "master"],
                    cwd=self.config.target_dir,
                    check=False,
                )
            except:
                pass

    def _test_valid_branch(self):
        """Test valid branch and commit"""
        self.run_command(
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

        self.run_command(["git", "add", "test_commit.php"], cwd=self.config.target_dir)

        # Set environment to bypass PHP analysis for faster testing
        env = os.environ.copy()
        env["BYPASS_PHP_ANALYSIS"] = "1"

        try:
            self.run_command(
                ["git", "commit", "-m", "feat: add test feature"],
                cwd=self.config.target_dir,
                env=env,
            )

            self.log.success("Valid branch + commit message accepted")

            # Check commit log
            result = self.run_command(
                ["git", "log", "-1", "--pretty=format:%h %s"],
                cwd=self.config.target_dir,
                capture_output=True,
            )
            self.log.info(f"Commit: {result.stdout}")

            # Check if ticket footer was appended
            result = self.run_command(
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
        self.run_command(
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

        self.run_command(["git", "add", "test_commit2.php"], cwd=self.config.target_dir)

        # Set environment to bypass PHP analysis and test branch validation
        env = os.environ.copy()
        env["BYPASS_PHP_ANALYSIS"] = "1"

        # This should fail due to invalid branch name
        result = self.run_command(
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

    def clean_environment(self):
        """Clean up test environment"""
        self.log.info(f"Cleaning up test environment at {self.config.target_dir}")

        if self.config.target_dir.exists():
            if self.is_ddev_running():
                self.log.info("Stopping DDEV project...")
                try:
                    self.run_command(["ddev", "stop"], cwd=self.config.target_dir)
                    self.run_command(
                        ["ddev", "delete", "--omit-snapshot", "--yes"],
                        cwd=self.config.target_dir,
                        check=False,
                    )
                except:
                    pass

            self.log.info("Removing project directory...")
            shutil.rmtree(self.config.target_dir)
            self.log.success("Test environment cleaned up")
        else:
            self.log.info(f"No test environment found at {self.config.target_dir}")

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
        print(f"  - PATH: {os.environ.get('PATH', 'Unknown')}")

    def run_full_test(self):
        """Run the complete test suite"""
        self.check_environment()
        self.check_requirements()
        self.setup_project()
        self.integrate_booster()
        self.verify_integration()
        self.test_branch_validation()

        self.log.success(
            f"Test completed successfully! Project is available at: {self.config.target_dir}"
        )
        self.log.info(f"To clean up, run: {sys.argv[0]} clean")
        self.log.info(f"To stop DDEV: cd {self.config.target_dir} && ddev stop")


def create_config() -> Config:
    """Create configuration from command line arguments"""
    parser = argparse.ArgumentParser(
        description="Integration test script for PHP Booster",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Actions:
  full           - Run the complete test (default)
  env-check      - Only check the environment and requirements
  setup          - Only set up the project (creates new environment)
  setup-resume   - Resume setup if project exists but isn't finished
  integrate      - Only run booster integration (requires existing project)
  verify         - Only verify the integration (requires integrated project)
  test-hooks     - Only test git hooks and branch validation
  clean          - Clean up the test environment
  status         - Show current test environment status

Examples:
  %(prog)s                              # Run full test with defaults
  %(prog)s env-check                    # Only check environment
  %(prog)s setup laravel my-app         # Only set up a Laravel project
  %(prog)s integrate                    # Run integration on existing project
  %(prog)s test-hooks                   # Test hooks on existing integrated project
  %(prog)s status                       # Check what's already done
  %(prog)s clean                        # Remove test environment
        """,
    )

    parser.add_argument(
        "action", nargs="?", default="full", help="Action to perform (default: full)"
    )

    parser.add_argument(
        "project_type",
        nargs="?",
        default="laravel",
        choices=["symfony", "laravel"],
        help="Project type (default: laravel)",
    )

    parser.add_argument(
        "project_name",
        nargs="?",
        default=None,
        help="Project name (default: booster-test-{framework})",
    )

    parser.add_argument(
        "target_dir",
        nargs="?",
        help="Target directory (default: tests/PROJECT_TYPE/PROJECT_NAME)",
    )

    args = parser.parse_args()

    # Set default project name if not provided (framework-specific)
    if args.project_name is None:
        args.project_name = f"booster-test-{args.project_type}"

    # Calculate paths
    script_dir = Path(__file__).parent.absolute()
    root_dir = script_dir.parent.parent

    # Set default target dir if not provided
    if args.target_dir is None:
        target_dir = root_dir / "tests" / args.project_type / args.project_name
    else:
        target_dir = Path(args.target_dir)

    return Config(
        action=args.action,
        project_type=args.project_type,
        project_name=args.project_name,
        target_dir=target_dir,
        script_dir=script_dir,
        root_dir=root_dir,
        use_colors=os.getenv("NO_COLOR") is None,
    )


def main():
    """Main entry point"""
    config = create_config()
    env = TestEnvironment(config)

    # Action dispatch
    actions = {
        "full": env.run_full_test,
        "env-check": lambda: (env.check_environment(), env.check_requirements()),
        "setup": lambda: (
            env.check_environment(),
            env.check_requirements(),
            env.setup_project(),
        ),
        "setup-resume": lambda: (
            env.check_environment(),
            env.check_requirements(),
            env.setup_resume(),
        ),
        "integrate": lambda: (
            env.check_environment(),
            env.check_requirements(),
            env.integrate_booster(),
        ),
        "verify": lambda: (
            env.check_environment(),
            env.check_requirements(),
            env.verify_integration(),
        ),
        "test-hooks": lambda: (
            env.check_environment(),
            env.check_requirements(),
            env.test_branch_validation(),
        ),
        "clean": env.clean_environment,
        "status": env.show_status,
        "help": lambda: print("Use --help for usage information"),
    }

    action_func = actions.get(config.action)
    if action_func:
        action_func()
    else:
        env.log.error(f"Unknown action: {config.action}")
        print("Use --help for usage information")
        sys.exit(1)


if __name__ == "__main__":
    main()
