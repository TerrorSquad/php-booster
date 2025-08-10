import assert from 'node:assert';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Dynamically import the CJS config inside an ESM test
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rawModule = await import(pathToFileURL(path.join(ROOT, 'validate-branch-name.config.cjs')));
// Support both direct CJS export and default wrapper (ESM interop)
const exported = rawModule.pattern || (rawModule.default && rawModule.default.pattern) ? (rawModule.pattern ? rawModule : rawModule.default) : rawModule;
const { pattern, regex: exportedRegex } = exported;

if (!pattern) {
  console.error('Loaded module keys:', Object.keys(rawModule));
  throw new Error('Branch name validation pattern is undefined');
}

// Prefer an exported RegExp instance if present, else build one.
const regex = exportedRegex instanceof RegExp ? exportedRegex : new RegExp(pattern, 'i');

function pass(name) {
  const res = regex.test(name);
  if (!res) {
    console.error('DEBUG PATTERN (expected PASS):', regex);
  }
  assert(res, `Expected to PASS but FAILED: ${name}`);
}

function fail(name) {
  const res = regex.test(name);
  if (res) {
    console.error('DEBUG PATTERN (expected FAIL):', regex);
  }
  assert(!res, `Expected to FAIL but PASSED: ${name}`);
}

// Collect test cases
const valid = [
  'feature/PRJ-123-something',
  'feature/ERM-987-another-thing',
  'feature/something',
  'fix/PRJ-1-x',
  'chore/do-stuff',
  'task/PRJ-9999-long-name-here',
];

const invalid = [

  'bug/--PRJ-1235------',
  'feature/PRJ-a-aa',          // letters instead of number
  'feature/PRJ-1WIP-a-aa',      // number followed immediately by letters w/o dash separator
  'feature/PRJ-123',            // ticket present but no trailing name after dash
  'feature/PRJ-123--double',    // double dash after ticket
  'feature/PRJ-123-',           // trailing dash only
  'feature/ERM-abc-name',       // non-numeric part where number expected
  'feature/PRJ-0123bad-name',   // digits then letters without separating dash
  'feature/--bad',              // starts with illegal pattern
  'feature/-bad',               // leading dash
  'feature/PRJ-',               // just prefix and dash
];

for (const v of valid) pass(v);
for (const x of invalid) fail(x);

console.log(`Branch name validation tests passed. (${valid.length} valid, ${invalid.length} invalid)`);
