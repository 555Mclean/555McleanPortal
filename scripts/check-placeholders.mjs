import { readFileSync } from 'fs';
import { findPlaceholders } from './check-lib.mjs';

const html = readFileSync('./index.html', 'utf8');
const findings = findPlaceholders(html);

if (findings.length === 0) {
  console.log('OK: No placeholder contact info found in index.html');
  process.exit(0);
}

console.log(`PLACEHOLDERS: ${findings.length} item(s) still need updating:\n`);
findings.forEach(f => console.log(`  - ${f}`));
process.exit(1);
