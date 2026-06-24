// Pure predicate logic shared by the CI health-check scripts. Kept free of file
// I/O and process.exit so it can be unit-tested; the *.mjs scripts wrap these.

// ── Stale meeting detection ──
export function parseLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Meetings with a confirmed isoDate that is today or later.
export function upcomingMeetings(meetings, today) {
  return meetings.filter(m => m.isoDate && parseLocalDate(m.isoDate) >= today);
}

// ── Placeholder contact-info detection ──
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

// Descriptions of every placeholder still present in the given HTML.
export function findPlaceholders(html, checks = PLACEHOLDER_CHECKS) {
  return checks.filter(({ needle }) => html.includes(needle)).map(({ desc }) => desc);
}
