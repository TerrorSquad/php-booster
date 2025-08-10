#!/usr/bin/env node
// Usage:
//   node commit-utils.js --need-ticket        -> prints 'yes' or 'no'
//   node commit-utils.js --footer-label       -> prints footer label (e.g. Closes)
//   node commit-utils.js --extract-ticket <branch-name> -> prints ticket ID (exit 0) or exits 1 if not found
//   node commit-utils.js                      -> legacy 2-line NEED_TICKET / FOOTER_LABEL output
//
// Exit codes:
//   0 success / (for --extract-ticket: ticket found OR ticket not required by config)
//   1 generic failure (including ticket required but not found)
//   2 usage / flag errors
//
// Notes:
// - Works in both CJS and ESM contexts by dynamically creating require if needed.
// - Ticket extraction is only enforced if both ticketIdPrefix and ticketNumberPattern are present in config.

(async () => {
  try {
    let _require = (typeof require !== 'undefined') ? require : null;
    if (!_require) {
      const { createRequire } = await import('module');
      _require = createRequire(import.meta.url);
    }

    const mod = _require('../validate-branch-name.config.cjs');
    const cfg = mod.config || mod.patterns || mod;

    const needTicket = !!(cfg.ticketIdPrefix && cfg.ticketNumberPattern);
    let footerLabel = (cfg.commitFooterLabel || 'Closes').toString().trim();
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(footerLabel)) footerLabel = 'Closes';
    if (footerLabel.includes('=') || footerLabel.includes('\n')) footerLabel = 'Closes';

    const [,, arg1, arg2] = process.argv;

    switch (arg1) {
      case '--need-ticket': {
        process.stdout.write(needTicket ? 'yes' : 'no');
        return; }
      case '--footer-label': {
        process.stdout.write(footerLabel);
        return; }
      case '--extract-ticket': {
        const branchName = arg2;
        if (!branchName) {
          process.stderr.write('Missing <branch-name> for --extract-ticket\n');
          process.exit(2);
        }
        if (!needTicket) {
          // Ticket not mandated: succeed silently (previous behavior was exit 0)
          return;
        }
        const prefixPattern = cfg.ticketIdPrefix;
        const numberPattern = cfg.ticketNumberPattern;
        try {
          const ticketRegex = new RegExp(`((?:${prefixPattern})-${numberPattern})`, 'i');
          const match = branchName.match(ticketRegex);
          if (match) {
            process.stdout.write(match[1]);
            return; // exit 0
          } else {
            process.exit(1); // required but not found
          }
        } catch (rxErr) {
          process.stderr.write(`Ticket regex error: ${rxErr && rxErr.message}\n`);
          process.exit(1);
        }
        return; }
      case undefined: {
        // Legacy output mode
        process.stdout.write(`NEED_TICKET=${needTicket ? 'yes' : 'no'}\n`);
        process.stdout.write(`FOOTER_LABEL=${footerLabel}\n`);
        return; }
      default: {
        process.stderr.write(`Unknown flag: ${arg1}\n`);
        process.exit(2); }
    }
  } catch (e) {
    process.stderr.write(`commit-utils error: ${e && e.message}\n`);
    process.exit(1);
  }
})();
