#!/usr/bin/env python3
"""
Configuration and constants for the PHP Booster integration tests
"""

from dataclasses import dataclass
from pathlib import Path


@dataclass
class Config:
    action: str
    project_type: str
    project_name: str
    target_dir: Path
    script_dir: Path
    root_dir: Path
    use_colors: bool
    automated: bool = False
    verbose: bool = False


class Colors:
    """ANSI color codes for terminal output"""

    BLUE = "\033[0;34m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[0;33m"
    RED = "\033[0;31m"
    RESET = "\033[0m"
