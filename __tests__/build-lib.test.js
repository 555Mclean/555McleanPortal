import { describe, it, expect } from 'vitest';
import {
  escapeHTML, escapeAttr, CATEGORY_LABELS, ICONS,
  buildMeetingItem, eventBadgeLabel, buildUpdateCard,
  buildFilterButtons, noticeState, nextMeetingTile,
} from '../build-lib.js';

// A fixed "now" so date-relative output is deterministic.
const NOW = new Date(2026, 5, 24, 12, 0, 0); // 2026-06-24 12:00 local

// ─── escaping ────────────────────────────────────────────────────────────────

describe('escapeHTML', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHTML('<b>"Tom & Jerry"</b>')).toBe('&lt;b&gt;&quot;Tom &amp; Jerry&quot;&lt;/b&gt;');
  });

  it('escapes & before other entities so it is not double-encoded', () => {
    expect(escapeHTML('&lt;')).toBe('&amp;lt;');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHTML('Annual Meeting 2026')).toBe('Annual Meeting 2026');
  });
});

describe('escapeAttr', () => {
  it('escapes single quotes and the opening angle bracket for attribute contexts', () => {
    expect(escapeAttr(`O'Brien <Hall`)).toBe('O&#39;Brien &lt;Hall');
  });

  it('escapes double quotes', () => {
    expect(escapeAttr('say "hi"')).toBe('say &quot;hi&quot;');
  });
});

// ─── buildMeetingItem ──────────────────────────────────────────────────────────

describe('buildMeetingItem', () => {
  const base = { day: '8', month: 'JUN', title: 'Board Meeting', detail: 'Lobby, 7pm' };

  it('renders the day, month, title and detail', () => {
    const html = buildMeetingItem(base);
    expect(html).toContain('<div class="day">8</div>');
    expect(html).toContain('<div class="month">JUN</div>');
    expect(html).toContain('<h4>Board Meeting</h4>');
    expect(html).toContain('<p>Lobby, 7pm</p>');
  });

  it('adds the "next" modifier class when m.next is set', () => {
    expect(buildMeetingItem({ ...base, next: true })).toContain('class="meeting-date next"');
  });

  it('omits the "next" modifier when m.next is falsy', () => {
    expect(buildMeetingItem(base)).toContain('class="meeting-date"');
  });

  it('escapes the title to prevent HTML injection', () => {
    expect(buildMeetingItem({ ...base, title: '<script>x</script>' }))
      .toContain('&lt;script&gt;x&lt;/script&gt;');
  });

  it('renders an escaped badge when provided', () => {
    expect(buildMeetingItem({ ...base, badge: 'A & B' }))
      .toContain('<span class="badge">A &amp; B</span>');
  });

  it('renders an Add-to-Calendar button only when calendar data exists', () => {
    expect(buildMeetingItem(base)).not.toContain('addToCalendar');
    const withCal = buildMeetingItem({
      ...base, isoDate: '2026-06-08',
      calendar: { location: 'Lobby', startTime: '19:00', endTime: '20:00' },
    });
    expect(withCal).toContain('addToCalendar(');
    expect(withCal).toContain('2026-06-08');
  });

  it('escapes apostrophes in the calendar location attribute', () => {
    const html = buildMeetingItem({
      ...base, isoDate: '2026-06-08',
      calendar: { location: "O'Brien Hall", startTime: '19:00', endTime: '20:00' },
    });
    expect(html).toContain('O&#39;Brien Hall');
  });
});

// ─── eventBadgeLabel ───────────────────────────────────────────────────────────

describe('eventBadgeLabel', () => {
  it('returns "Today" for the current date', () => {
    expect(eventBadgeLabel('2026-06-24', NOW)).toBe('Today');
  });

  it('returns "Tomorrow" for the next day', () => {
    expect(eventBadgeLabel('2026-06-25', NOW)).toBe('Tomorrow');
  });

  it('returns a short month/day label for dates further out', () => {
    expect(eventBadgeLabel('2026-07-04', NOW)).toBe('Jul 4');
  });

  it('returns null for past dates', () => {
    expect(eventBadgeLabel('2026-06-23', NOW)).toBeNull();
  });
});

// ─── buildUpdateCard ───────────────────────────────────────────────────────────

describe('buildUpdateCard', () => {
  const base = { date: 'Jun 1', category: 'general', title: 'Roof Work', body: 'Starting soon.' };

  it('maps known categories to their human label', () => {
    expect(buildUpdateCard({ ...base, category: 'safety' }, NOW)).toContain('Safety Notice');
  });

  it('falls back to the raw category when unknown', () => {
    expect(buildUpdateCard({ ...base, category: 'custom' }, NOW)).toContain('· custom');
  });

  it('exposes the category as a data attribute for client-side filtering', () => {
    expect(buildUpdateCard(base, NOW)).toContain('data-category="general"');
  });

  it('escapes the title and body', () => {
    const html = buildUpdateCard({ ...base, title: '<x>', body: 'a & b' }, NOW);
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('a &amp; b');
  });

  it('renders a relative event badge when eventDate is in the future', () => {
    const html = buildUpdateCard({ ...base, eventDate: '2026-06-25' }, NOW);
    expect(html).toContain('data-event-date="2026-06-25"');
    expect(html).toContain('>Tomorrow<');
  });

  it('omits the event badge entirely when the eventDate is in the past', () => {
    const html = buildUpdateCard({ ...base, eventDate: '2026-06-01' }, NOW);
    expect(html).not.toContain('data-event-date');
  });

  it('renders a static badge when given badge but no eventDate', () => {
    expect(buildUpdateCard({ ...base, badge: 'New' }, NOW)).toContain('<span class="badge">New</span>');
  });

  it('prefers the eventDate badge over a static badge', () => {
    const html = buildUpdateCard({ ...base, eventDate: '2026-06-24', badge: 'New' }, NOW);
    expect(html).toContain('>Today<');
    expect(html).not.toContain('>New<');
  });

  it('marks a priority notice with the data attribute, class and Important badge', () => {
    const html = buildUpdateCard({ ...base, priority: true }, NOW);
    expect(html).toContain('data-priority="true"');
    expect(html).toContain('update-card--priority');
    expect(html).toContain('update-important');
  });

  it('leaves a normal notice without any priority markup', () => {
    const html = buildUpdateCard(base, NOW);
    expect(html).not.toContain('data-priority');
    expect(html).not.toContain('update-card--priority');
  });

  it('exposes the date as a data attribute for the date filter', () => {
    expect(buildUpdateCard({ ...base, date: 'June 28, 2026' }, NOW))
      .toContain('data-date="June 28, 2026"');
  });
});

// ─── buildFilterButtons ────────────────────────────────────────────────────────

describe('buildFilterButtons', () => {
  it('always emits an active "All" button first', () => {
    const html = buildFilterButtons([{ category: 'general' }]);
    expect(html.indexOf('data-filter="all"')).toBeLessThan(html.indexOf('data-filter="general"'));
    expect(html).toContain('class="filter-btn active" data-filter="all"');
  });

  it('emits one button per unique category, preserving first-seen order', () => {
    const html = buildFilterButtons([
      { category: 'general' }, { category: 'safety' }, { category: 'general' },
    ]);
    expect(html.match(/data-filter="general"/g)).toHaveLength(1);
    expect(html.indexOf('data-filter="general"')).toBeLessThan(html.indexOf('data-filter="safety"'));
  });

  it('uses the category label map when available', () => {
    expect(buildFilterButtons([{ category: 'maintenance' }])).toContain('>Maintenance</button>');
  });

  it('title-cases unknown categories for their label', () => {
    expect(buildFilterButtons([{ category: 'pets' }])).toContain('>Pets</button>');
  });
});

// ─── noticeState ───────────────────────────────────────────────────────────────

describe('noticeState', () => {
  it('is inactive when notice.active is false', () => {
    const s = noticeState({ active: false, message: 'Hi', type: 'info' }, NOW);
    expect(s.active).toBe(false);
    expect(s.html).toBe('');
  });

  it('is inactive when there is no message', () => {
    expect(noticeState({ active: true, type: 'info' }, NOW).active).toBe(false);
  });

  it('renders an active bar with the icon and escaped message', () => {
    const s = noticeState({ active: true, message: 'Water <off>', type: 'warning' }, NOW);
    expect(s.active).toBe(true);
    expect(s.html).toContain(ICONS.warning);
    expect(s.html).toContain('Water &lt;off&gt;');
    expect(s.html).toContain('notice-warning');
  });

  it('falls back to the info icon for unknown types', () => {
    expect(noticeState({ active: true, message: 'Hi', type: 'bogus' }, NOW).html).toContain('ℹ️');
  });

  it('includes a dismiss button only when dismissible', () => {
    expect(noticeState({ active: true, message: 'Hi', type: 'info', dismissible: true }, NOW).html)
      .toContain('dismissNotice()');
    expect(noticeState({ active: true, message: 'Hi', type: 'info' }, NOW).html)
      .not.toContain('dismissNotice()');
  });

  it('marks a notice expired and inactive once past the expiry time', () => {
    const s = noticeState({ active: true, message: 'Hi', type: 'info', expires: '2026-06-01T00:00' }, NOW);
    expect(s.expired).toBe(true);
    expect(s.active).toBe(false);
    expect(s.html).toBe('');
  });

  it('keeps a future-dated notice active and carries the expiry data attribute', () => {
    const s = noticeState({ active: true, message: 'Hi', type: 'info', expires: '2026-12-31T00:00' }, NOW);
    expect(s.expired).toBe(false);
    expect(s.active).toBe(true);
    expect(s.html).toContain('data-expires="2026-12-31T00:00"');
  });
});

// ─── nextMeetingTile ───────────────────────────────────────────────────────────

describe('nextMeetingTile', () => {
  it('returns "Date TBD" when there are no meetings', () => {
    expect(nextMeetingTile([], NOW)).toBe('Date TBD');
  });

  it('falls back to "<month> · Date TBD" when no meeting has an isoDate', () => {
    expect(nextMeetingTile([{ month: 'July' }], NOW)).toBe('July · Date TBD');
  });

  it('picks the first meeting that has not yet ended', () => {
    const tile = nextMeetingTile([
      { month: 'Jun', day: '1', title: 'Past', isoDate: '2026-06-01' },
      { month: 'Jul', day: '8', title: 'Upcoming', isoDate: '2026-07-08' },
    ], NOW);
    expect(tile).toContain('Jul 8 · Upcoming');
  });

  it('skips a meeting whose calendar end time has already passed today', () => {
    const tile = nextMeetingTile([
      { month: 'Jun', day: '24', title: 'Earlier', isoDate: '2026-06-24',
        calendar: { startTime: '08:00', endTime: '09:00' } },
      { month: 'Jun', day: '24', title: 'Later', isoDate: '2026-06-24',
        calendar: { startTime: '19:00', endTime: '20:00' } },
    ], NOW);
    expect(tile).toContain('Later');
    expect(tile).not.toContain('Earlier');
  });

  it('treats a dateless calendar as ending at 23:59 (still upcoming today)', () => {
    const tile = nextMeetingTile([
      { month: 'Jun', day: '24', title: 'AllDay', isoDate: '2026-06-24' },
    ], NOW);
    expect(tile).toContain('Jun 24 · AllDay');
    expect(tile).not.toContain('countdown-chip');
  });

  it('emits a countdown chip with start/end data when calendar times exist', () => {
    const tile = nextMeetingTile([
      { month: 'Jul', day: '8', title: 'Board', isoDate: '2026-07-08',
        calendar: { startTime: '19:00', endTime: '20:00' } },
    ], NOW);
    expect(tile).toContain('id="meeting-countdown"');
    expect(tile).toContain('data-start="2026-07-08T19:00:00"');
    expect(tile).toContain('data-end="2026-07-08T20:00:00"');
  });

  it('escapes the meeting title in the tile', () => {
    const tile = nextMeetingTile([
      { month: 'Jul', day: '8', title: '<x>', isoDate: '2026-07-08' },
    ], NOW);
    expect(tile).toContain('&lt;x&gt;');
  });
});
