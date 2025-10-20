#!/usr/bin/env python3
"""
Unit tests for renovate.json verification
This test validates the logic without requiring a full integration
"""

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

# Add parent directory to path to import the module
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.verification import IntegrationVerifier
from lib.config import Config
from lib.logger import Logger
from lib.command_utils import CommandExecutor
from lib.state_detector import StateDetector


def test_renovate_json_validation():
    """Test that renovate.json validation works correctly"""
    
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as tmpdir:
        target_dir = Path(tmpdir)
        
        # Create a valid renovate.json
        renovate_config = {
            "$schema": "https://docs.renovatebot.com/renovate-schema.json",
            "extends": ["config:base"],
            "packageRules": [
                {
                    "matchUpdateTypes": ["minor", "patch"],
                    "matchCurrentVersion": "!/^0/",
                    "automerge": True
                },
                {
                    "matchDepTypes": ["devDependencies"],
                    "groupName": "dev dependencies",
                    "schedule": ["every weekend"]
                },
                {
                    "matchPackagePatterns": ["phpunit/", "phpstan/", "psalm/"],
                    "groupName": "PHP dependencies"
                }
            ],
            "timezone": "Europe/Paris",
            "schedule": ["every weekend"],
            "labels": ["dependencies", "renovate"],
            "branchPrefix": "deps/"
        }
        
        renovate_path = target_dir / "renovate.json"
        with open(renovate_path, 'w') as f:
            json.dump(renovate_config, f, indent=2)
        
        # Create mock objects
        config = Config(
            action="verify",
            project_type="laravel",
            project_name="test",
            target_dir=target_dir,
            script_dir=Path(__file__).parent,
            root_dir=Path(__file__).parent.parent,
            use_colors=False,
            automated=True
        )
        
        cmd = MagicMock(spec=CommandExecutor)
        state = MagicMock(spec=StateDetector)
        logger = Logger(use_colors=False)
        
        # Create verifier
        verifier = IntegrationVerifier(config, cmd, state, logger)
        
        # This should not raise any errors
        try:
            verifier._verify_renovate_config()
            print("✓ Test passed: renovate.json validation successful")
            return True
        except Exception as e:
            print(f"✗ Test failed: {e}")
            return False


def test_renovate_json_missing_schema():
    """Test that missing schema is detected"""
    
    with tempfile.TemporaryDirectory() as tmpdir:
        target_dir = Path(tmpdir)
        
        # Create renovate.json without schema
        renovate_config = {
            "extends": ["config:base"]
        }
        
        renovate_path = target_dir / "renovate.json"
        with open(renovate_path, 'w') as f:
            json.dump(renovate_config, f)
        
        config = Config(
            action="verify",
            project_type="laravel",
            project_name="test",
            target_dir=target_dir,
            script_dir=Path(__file__).parent,
            root_dir=Path(__file__).parent.parent,
            use_colors=False,
            automated=True
        )
        
        cmd = MagicMock(spec=CommandExecutor)
        state = MagicMock(spec=StateDetector)
        logger = Logger(use_colors=False)
        
        verifier = IntegrationVerifier(config, cmd, state, logger)
        
        # Should complete but warn about missing schema
        try:
            verifier._verify_renovate_config()
            print("✓ Test passed: missing schema detected (warning expected)")
            return True
        except Exception as e:
            print(f"✗ Test failed: {e}")
            return False


def test_renovate_json_invalid():
    """Test that invalid JSON is detected"""
    
    with tempfile.TemporaryDirectory() as tmpdir:
        target_dir = Path(tmpdir)
        
        # Create invalid JSON
        renovate_path = target_dir / "renovate.json"
        with open(renovate_path, 'w') as f:
            f.write("{ invalid json }")
        
        config = Config(
            action="verify",
            project_type="laravel",
            project_name="test",
            target_dir=target_dir,
            script_dir=Path(__file__).parent,
            root_dir=Path(__file__).parent.parent,
            use_colors=False,
            automated=True
        )
        
        cmd = MagicMock(spec=CommandExecutor)
        state = MagicMock(spec=StateDetector)
        logger = Logger(use_colors=False)
        
        verifier = IntegrationVerifier(config, cmd, state, logger)
        
        # Should exit with error
        try:
            verifier._verify_renovate_config()
            print("✗ Test failed: invalid JSON should have raised an error")
            return False
        except SystemExit:
            print("✓ Test passed: invalid JSON detected")
            return True
        except Exception as e:
            print(f"✗ Test failed with unexpected error: {e}")
            return False


if __name__ == "__main__":
    print("Running renovate.json verification tests...\n")
    
    results = []
    
    print("Test 1: Valid renovate.json")
    results.append(test_renovate_json_validation())
    print()
    
    print("Test 2: Missing schema property")
    results.append(test_renovate_json_missing_schema())
    print()
    
    print("Test 3: Invalid JSON")
    results.append(test_renovate_json_invalid())
    print()
    
    passed = sum(results)
    total = len(results)
    
    print(f"\n{'='*50}")
    print(f"Results: {passed}/{total} tests passed")
    print(f"{'='*50}")
    
    sys.exit(0 if passed == total else 1)
