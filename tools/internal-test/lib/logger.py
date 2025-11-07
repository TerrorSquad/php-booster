#!/usr/bin/env python3
"""
Logging utilities for the PHP Booster integration tests
"""

import os
import sys
from .config import Colors


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

    def section(self, title: str):
        """Print a section header with a title"""
        print("")
        print("═══════════════════════════════════════════════════════════════")
        self.info(title)
        print("═══════════════════════════════════════════════════════════════")
        print("")

    def banner(self, title: str):
        """Print a banner box with a title"""
        print("")
        print("╔════════════════════════════════════════════════════════════════╗")
        print("║                                                                ║")
        print(f"║{title:^64}║")
        print("║                                                                ║")
        print("╚════════════════════════════════════════════════════════════════╝")
        print("")
        print("")
