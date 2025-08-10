#!/usr/bin/env node

/**
 * Commit Utilities - Helper script for Git hooks
 * 
 * Usage:
 *   node commit-utils.js --need-ticket              -> prints 'yes' or 'no'
 *   node commit-utils.js --footer-label             -> prints footer label (e.g. 'Closes')
 *   node commit-utils.js --extract-ticket <branch>  -> prints ticket ID or exits with error

 *
 * Exit codes:
 *   0 - Success (for --extract-ticket: ticket found OR ticket not required)
 *   1 - Failure (including ticket required but not found)
 *   2 - Usage/argument errors
 *
 * Features:
 *   - Works in both CJS and ESM contexts by dynamically creating require
 *   - Ticket extraction enforced only if both ticketIdPrefix and ticketNumberPattern exist
 *   - Safe footer label sanitization with fallback to 'Closes'
 */

// --- Configuration Loading ---
async function loadConfig() {
    try {
        let _require = (typeof require !== 'undefined') ? require : null;
        if (!_require) {
            const { createRequire } = await import('module');
            _require = createRequire(import.meta.url);
        }

        const mod = _require('../validate-branch-name.config.cjs');
        return mod.config || mod.patterns || mod;
    } catch (error) {
        throw new Error(`Failed to load branch validation config: ${error.message}`);
    }
}

// --- Configuration Processing ---
function processConfig(cfg) {
    const needTicket = !!(cfg.ticketIdPrefix && cfg.ticketNumberPattern);
    
    let footerLabel = (cfg.commitFooterLabel || 'Closes').toString().trim();
    
    // Sanitize footer label - must be valid identifier, no special chars
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(footerLabel)) {
        footerLabel = 'Closes';
    }
    if (footerLabel.includes('=') || footerLabel.includes('\n')) {
        footerLabel = 'Closes';
    }
    
    return { needTicket, footerLabel, config: cfg };
}

// --- Command Handlers ---
function handleNeedTicket(needTicket) {
    process.stdout.write(needTicket ? 'yes' : 'no');
}

function handleFooterLabel(footerLabel) {
    process.stdout.write(footerLabel);
}

function handleExtractTicket(branchName, { needTicket, config }) {
    if (!branchName) {
        process.stderr.write('Missing <branch-name> for --extract-ticket\n');
        process.exit(2);
    }
    
    if (!needTicket) {
        // Ticket not mandated: succeed silently for backward compatibility
        return;
    }
    
    const { ticketIdPrefix, ticketNumberPattern } = config;
    
    try {
        const ticketRegex = new RegExp(`((?:${ticketIdPrefix})-${ticketNumberPattern})`, 'i');
        const match = branchName.match(ticketRegex);
        
        if (match) {
            process.stdout.write(match[1]);
        } else {
            process.exit(1); // Required but not found
        }
    } catch (regexError) {
        process.stderr.write(`Ticket regex error: ${regexError.message}\n`);
        process.exit(1);
    }
}

// --- Argument Processing ---
function parseArguments() {
    const [,, command, argument] = process.argv;
    
    if (!command) {
        process.stderr.write('Missing command. Use --need-ticket, --footer-label, or --extract-ticket <branch>\n');
        process.exit(2);
    }
    
    return {
        command,
        argument
    };
}

// --- Main Execution ---
async function main() {
    try {
        const config = await loadConfig();
        const { needTicket, footerLabel, config: rawConfig } = processConfig(config);
        const { command, argument } = parseArguments();
        
        switch (command) {
            case '--need-ticket':
                handleNeedTicket(needTicket);
                break;
                
            case '--footer-label':
                handleFooterLabel(footerLabel);
                break;
                
            case '--extract-ticket':
                handleExtractTicket(argument, { needTicket, config: rawConfig });
                break;
                
            default:
                process.stderr.write(`Unknown command: ${command}\n`);
                process.stderr.write('Use --need-ticket, --footer-label, or --extract-ticket <branch>\n');
                process.exit(2);
        }
    } catch (error) {
        process.stderr.write(`commit-utils error: ${error.message}\n`);
        process.exit(1);
    }
}

// Execute main function
main().catch((error) => {
    process.stderr.write(`Unexpected error: ${error.message}\n`);
    process.exit(1);
});
