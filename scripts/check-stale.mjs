import { readFileSync } from 'fs';

const meetings = JSON.parse(readFileSync('./data/meetings.json', 'utf8'));

const today = new Date();
today.setHours(0, 0, 0, 0);

function parseLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const upcoming = meetings.filter(m => m.isoDate && parseLocalDate(m.isoDate) >= today);

if (upcoming.length === 0) {
  console.log('STALE: No upcoming meetings with confirmed dates in data/meetings.json');
  process.exit(1);
}

console.log(`OK: ${upcoming.length} upcoming confirmed meeting(s)`);
