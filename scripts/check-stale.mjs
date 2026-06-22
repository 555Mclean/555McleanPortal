import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';

export function parseLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Meetings with a confirmed isoDate on or after `today`.
export function findUpcomingMeetings(meetings, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return meetings.filter(m => m.isoDate && parseLocalDate(m.isoDate) >= start);
}

function main() {
  const meetings = JSON.parse(readFileSync('./data/meetings.json', 'utf8'));
  const upcoming = findUpcomingMeetings(meetings);

  if (upcoming.length === 0) {
    console.log('STALE: No upcoming meetings with confirmed dates in data/meetings.json');
    process.exit(1);
  }

  console.log(`OK: ${upcoming.length} upcoming confirmed meeting(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
