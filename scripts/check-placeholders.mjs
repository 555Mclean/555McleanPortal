import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';

export const PLACEHOLDER_CHECKS = [
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

// Returns the descriptions of every placeholder still present in `html`.
export function findPlaceholders(html, checks = PLACEHOLDER_CHECKS) {
  return checks.filter(({ needle }) => html.includes(needle)).map(({ desc }) => desc);
}

function main() {
  const html = readFileSync('./index.html', 'utf8');
  const findings = findPlaceholders(html);

  if (findings.length === 0) {
    console.log('OK: No placeholder contact info found in index.html');
    process.exit(0);
  }

  console.log(`PLACEHOLDERS: ${findings.length} item(s) still need updating:\n`);
  findings.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
