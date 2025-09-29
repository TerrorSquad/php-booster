#!/usr/bin/env python3
"""
PHP Booster Integration Tests Library

A modular library for testing the PHP Booster integration.
"""

from .config import Config, Colors
from .logger import Logger
from .command_utils import CommandExecutor
from .state_detector import StateDetector
from .environment import EnvironmentChecker
from .project_setup import ProjectSetup
from .booster_integration import BoosterIntegration
from .verification import IntegrationVerifier
from .hook_testing import HookTester
from .status_reporter import StatusReporter
from .cleanup import EnvironmentCleaner
from .test_orchestrator import TestOrchestrator

__version__ = "1.0.0"
__author__ = "PHP Booster Team"

__all__ = [
    "Config",
    "Colors",
    "Logger",
    "CommandExecutor",
    "StateDetector",
    "EnvironmentChecker",
    "ProjectSetup",
    "BoosterIntegration",
    "IntegrationVerifier",
    "HookTester",
    "StatusReporter",
    "EnvironmentCleaner",
    "TestOrchestrator",
]
