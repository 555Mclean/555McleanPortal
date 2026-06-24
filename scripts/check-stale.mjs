import { readFileSync } from 'fs';
import { upcomingMeetings } from './check-lib.mjs';

const meetings = JSON.parse(readFileSync('./data/meetings.json', 'utf8'));

const today = new Date();
today.setHours(0, 0, 0, 0);

const upcoming = upcomingMeetings(meetings, today);

if (upcoming.length === 0) {
  console.log('STALE: No upcoming meetings with confirmed dates in data/meetings.json');
  process.exit(1);
}

console.log(`OK: ${upcoming.length} upcoming confirmed meeting(s)`);
