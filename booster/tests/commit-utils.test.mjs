import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const utilPath = path.join(ROOT, 'tools', 'commit-utils.js');
if (!fs.existsSync(utilPath)) {
  console.error('commit-utils.js not found at', utilPath);
  process.exit(2);
}

function run(args) {
  const res = spawnSync('node', [utilPath, ...args], { encoding: 'utf8' });
  return { code: res.status, stdout: res.stdout.trim(), stderr: res.stderr.trim() };
}

// --need-ticket should be yes (given config sets ticketIdPrefix & ticketNumberPattern)
{
  const r = run(['--need-ticket']);
  assert.strictEqual(r.code, 0, '--need-ticket exit code');
  assert.strictEqual(r.stdout, 'yes', 'need-ticket output');
}

// --footer-label should equal configured value (Closes)
{
  const r = run(['--footer-label']);
  assert.strictEqual(r.code, 0, '--footer-label exit code');
  assert.strictEqual(r.stdout, 'Closes', 'footer label output');
}

// --extract-ticket success path
{
  const r = run(['--extract-ticket', 'feature/PRJ-123-something']);
  assert.strictEqual(r.code, 0, 'extract-ticket success code');
  assert.strictEqual(r.stdout, 'PRJ-123');
}

// --extract-ticket alternate prefix variant (ERM)
{
  const r = run(['--extract-ticket', 'feature/ERM-42-nice']);
  assert.strictEqual(r.code, 0, 'extract-ticket alt prefix success');
  assert.strictEqual(r.stdout, 'ERM-42');
}

// --extract-ticket should fail (exit 1) when ticket required but missing
{
  const r = run(['--extract-ticket', 'feature/just-a-name']);
  assert.strictEqual(r.code, 1, 'extract-ticket missing ticket exit code should be 1');
  assert.strictEqual(r.stdout, '', 'no stdout when ticket missing');
}

// Unknown flag -> exit 2
{
  const r = run(['--does-not-exist']);
  assert.strictEqual(r.code, 2, 'unknown flag exit code');
}

// Test missing command
{
  const r = run([]);
  assert.strictEqual(r.code, 2, 'missing command exit code');
}

console.log('commit-utils tests passed.');
