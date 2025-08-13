#!/usr/bin/env python3

"""
Commit Utilities - Helper script for Git hooks

Usage:
  python commit-utils.py --need-ticket              -> prints 'yes' or 'no'
  python commit-utils.py --footer-label             -> prints footer label (e.g. 'Closes')
  python commit-utils.py --extract-ticket <branch>  -> prints ticket ID or exits with error

Exit codes:
  0 - Success (for --extract-ticket: ticket found OR ticket not required)
  1 - Failure (including ticket required but not found)
  2 - Usage/argument errors

Features:
  - Pure Python implementation, always available in DDEV
  - Ticket extraction enforced only if both ticketIdPrefix and ticketNumberPattern exist
  - Safe footer label sanitization with fallback to 'Closes'
"""

import sys
import re
import os
import ast
import subprocess
from pathlib import Path


def load_config():
    """Load configuration from validate-branch-name.config.cjs"""
    config_path = Path(__file__).parent.parent / "validate-branch-name.config.cjs"
    
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    try:
        # Read the CommonJS file and extract the config
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse the CommonJS module to extract configuration
        # Look for config = { ... } pattern
        config_match = re.search(r'const config = ({.*?});', content, re.DOTALL)
        if not config_match:
            raise ValueError("Could not find config object in config file")
        
        config_str = config_match.group(1)
        
        # Convert JavaScript object to Python dict
        config = {}
        
        # Extract ticketIdPrefix (can be 'PRJ|ERM' format)
        prefix_match = re.search(r'ticketIdPrefix:\s*[\'"`]([^\'"`]+)[\'"`]', config_str)
        if prefix_match:
            config['ticketIdPrefix'] = prefix_match.group(1)
        
        # Extract ticketNumberPattern
        pattern_match = re.search(r'ticketNumberPattern:\s*[\'"`]([^\'"`]+)[\'"`]', config_str)
        if pattern_match:
            config['ticketNumberPattern'] = pattern_match.group(1)
        
        # Extract commitFooterLabel
        label_match = re.search(r'commitFooterLabel:\s*[\'"`]([^\'"`]+)[\'"`]', config_str)
        if label_match:
            config['commitFooterLabel'] = label_match.group(1)
        
        # Extract types array
        types_match = re.search(r'types:\s*\[(.*?)\]', config_str, re.DOTALL)
        if types_match:
            types_str = types_match.group(1)
            # Extract type strings
            type_list = re.findall(r'[\'"`]([^\'"`]+)[\'"`]', types_str)
            config['types'] = type_list
            
        return config
        
    except Exception as e:
        raise Exception(f"Failed to load branch validation config: {e}")


def process_config(cfg):
    """Process configuration and determine ticket requirements"""
    need_ticket = bool(cfg.get('ticketIdPrefix') and cfg.get('ticketNumberPattern'))
    
    footer_label = str(cfg.get('commitFooterLabel', 'Closes')).strip()
    
    # Sanitize footer label - must be valid identifier, no special chars
    if not re.match(r'^[A-Za-z][A-Za-z0-9_-]*$', footer_label):
        footer_label = 'Closes'
    if '=' in footer_label or '\n' in footer_label:
        footer_label = 'Closes'
    
    return {
        'need_ticket': need_ticket,
        'footer_label': footer_label,
        'config': cfg
    }


def handle_need_ticket(need_ticket):
    """Handle --need-ticket command"""
    print('yes' if need_ticket else 'no', end='')


def handle_footer_label(footer_label):
    """Handle --footer-label command"""
    print(footer_label, end='')


def handle_extract_ticket(branch_name, processed_config):
    """Handle --extract-ticket command"""
    if not branch_name:
        print('Missing <branch-name> for --extract-ticket', file=sys.stderr)
        sys.exit(2)
    
    need_ticket = processed_config['need_ticket']
    config = processed_config['config']
    
    if not need_ticket:
        # Ticket not mandated: succeed silently for backward compatibility
        return
    
    ticket_id_prefix = config.get('ticketIdPrefix', '')
    ticket_number_pattern = config.get('ticketNumberPattern', '')
    
    try:
        # Create regex pattern: ((?:PREFIX)-PATTERN)
        ticket_regex = re.compile(f'((?:{ticket_id_prefix})-{ticket_number_pattern})', re.IGNORECASE)
        match = ticket_regex.search(branch_name)
        
        if match:
            print(match.group(1), end='')
        else:
            sys.exit(1)  # Required but not found
            
    except re.error as e:
        print(f'Ticket regex error: {e}', file=sys.stderr)
        sys.exit(1)


def parse_arguments():
    """Parse command line arguments"""
    if len(sys.argv) < 2:
        print('Missing command. Use --need-ticket, --footer-label, or --extract-ticket <branch>', file=sys.stderr)
        sys.exit(2)
    
    command = sys.argv[1]
    argument = sys.argv[2] if len(sys.argv) > 2 else None
    
    return command, argument


def main():
    """Main execution function"""
    try:
        config = load_config()
        processed_config = process_config(config)
        command, argument = parse_arguments()
        
        if command == '--need-ticket':
            handle_need_ticket(processed_config['need_ticket'])
        elif command == '--footer-label':
            handle_footer_label(processed_config['footer_label'])
        elif command == '--extract-ticket':
            handle_extract_ticket(argument, processed_config)
        else:
            print(f'Unknown command: {command}', file=sys.stderr)
            print('Use --need-ticket, --footer-label, or --extract-ticket <branch>', file=sys.stderr)
            sys.exit(2)
            
    except Exception as e:
        print(f'commit-utils error: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
