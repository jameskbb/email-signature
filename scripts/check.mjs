import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
assert.equal(readFileSync('AGENTS.md', 'utf8'), readFileSync('CLAUDE.md', 'utf8'), 'Agent rules must match');
const excluded = new Set(['.git', 'node_modules', '.impeccable', 'test-results']);
function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) check(path);
    else if (/\.(md|html|js|mjs|css|json|yml)$/.test(path)) {
      assert.ok(!readFileSync(path, 'utf8').includes(String.fromCharCode(0x2014)), `Em dash in ${path}`);
    }
  }
}
check('.');
console.log('Repository checks passed.');
