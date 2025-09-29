#!/usr/bin/env python3
"""
Command execution utilities for the PHP Booster integration tests
"""

import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from .logger import Logger


class CommandExecutor:
    def __init__(self, logger: Logger):
        self.log = logger

    def run_command(
        self,
        cmd: List[str],
        cwd: Optional[Path] = None,
        check: bool = True,
        capture_output: bool = False,
        env: Optional[Dict[str, str]] = None,
    ) -> subprocess.CompletedProcess[str]:
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
