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

// Form inputs carry example values in placeholder="..." attributes — the phone
// field's "(914) 555-0000" is a formatting hint for the resident, not the
// building's emergency number. Strip those attribute values before matching so
// the health check doesn't file an issue about contact info that is already in.
export function stripInputPlaceholders(html) {
  return html.replace(/\splaceholder\s*=\s*(?:"[^"]*"|'[^']*')/gi, ' ');
}

// Descriptions of every placeholder still present in the given HTML.
export function findPlaceholders(html, checks = PLACEHOLDER_CHECKS) {
  const content = stripInputPlaceholders(html);
  return checks.filter(({ needle }) => content.includes(needle)).map(({ desc }) => desc);
}
