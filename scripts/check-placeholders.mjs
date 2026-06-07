import { readFileSync } from 'fs';

const html = readFileSync('./index.html', 'utf8');
const findings = [];

const checks = [
  {
    needle: 'board@example.com',
    desc:   'Board email is still a placeholder (board@example.com)',
  },
  {
    needle: 'info@example.com',
    desc:   'Managing agent email is still a placeholder (info@example.com)',
  },
  {
    needle: '(914) 555-0000',
    desc:   'Emergency phone number is still a placeholder ((914) 555-0000)',
  },
  {
    needle: 'Name &amp; contact to be confirmed',
    desc:   'Managing agent name is still set to "Name & contact to be confirmed"',
  },
];

for (const { needle, desc } of checks) {
  if (html.includes(needle)) findings.push(desc);
}

if (findings.length === 0) {
  console.log('OK: No placeholder contact info found in index.html');
  process.exit(0);
}

console.log(`PLACEHOLDERS: ${findings.length} item(s) still need updating:\n`);
findings.forEach(f => console.log(`  - ${f}`));
process.exit(1);
