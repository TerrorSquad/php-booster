
// Branch naming rules config (single source of truth)
const config = {
  // Allowed branch types
  types: ['feature', 'fix', 'chore', 'story', 'task', 'bug', 'sub-task'],
  // Optional ticket prefix and number (if not needed, set both to null)
  ticketIdPrefix: 'PRJ|ERM', // e.g. 'PRJ|ERM' (no parentheses)
  ticketNumberPattern: '[0-9]+', // e.g. '[0-9]+' or null
  // Branch name (after type and optional ticket)
  namePattern: '[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*',
  // Branches to skip validation
  skipped: ['wip', 'main', 'master', 'develop/test', 'develop/host1', 'develop/host2'],
  // Commit footer label to append with ticket (configurable)
  commitFooterLabel: 'Closes',
};

// Build regex for skipped branches
const skippedRegex = `^(${config.skipped.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`;

// Allowed branches pattern
const typePattern = `(${config.types.join('|')})`;
let allowedRegex;
if (config.ticketIdPrefix && config.ticketNumberPattern) {
  const prefixGroup = `(?:${config.ticketIdPrefix})`;
  const namePart = config.namePattern;
  const ticketCore = `${prefixGroup}-${config.ticketNumberPattern}`; // e.g. PRJ-123
  const withTicket = `${ticketCore}-${namePart}`; // PRJ-123-some-name
  const withoutTicket = `(?!(?:${config.ticketIdPrefix})-)${namePart}`; // name NOT starting with PRJ- or ERM-
  allowedRegex = `^${typePattern}/(?:${withTicket}|${withoutTicket})$`;
} else {
  allowedRegex = `^${typePattern}/${config.namePattern}$`;
}

// Export for use in scripts
module.exports = {
  config,
  pattern: `${skippedRegex}|${allowedRegex}`,
  errorMsg: [
    '============================================================',
    '🚫 Branch name validation failed!',
    '============================================================',
    '',
    'Your branch name does not match the required pattern.',
    '',
    'Allowed formats:',
    `  • <type>/${config.ticketIdPrefix ? '<optional-ticket-id>' : ''}<name>`,
    `    - <type>: ${config.types.join(', ')}`,
    config.ticketIdPrefix ? `    - <optional-ticket-id>: ${config.ticketIdPrefix.split('|').join(' or ')}-<number> (optional)` : '',
    `    - <name>: must match ${config.namePattern}`,
    '      (letters and numbers separated by single dashes, no consecutive or trailing dashes)',
    '',
    `🔹 Skipped branches (not validated): ${config.skipped.join(', ')}`,
    '',
    'Examples of valid branch names:',
    `  • feature/${config.ticketIdPrefix ? 'PRJ-123-' : ''}My-Feature`,
    `  • fix/${config.ticketIdPrefix ? 'ERM-456-' : ''}bug-fix`,
    '  • chore/Update-Docs',
    '',
    'Examples of invalid branch names:',
    '  • feature/--bad--name',
    '  • fix/invalid-',
    '  • bug/-startdash',
    '  • story/endswith-',
    '',
    '============================================================',
  ].filter(Boolean).join('\n'),
};
