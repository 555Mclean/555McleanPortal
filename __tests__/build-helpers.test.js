import { describe, it, expect } from 'vitest';
import { relativeDayLabel } from '../main.js';
import {
  escapeHTML, escapeAttr, buildMeetingItem, buildUpdateCard,
  buildFilterButtons, noticeState, buildNoticeBar, nextMeetingTile,
} from '../lib/build-helpers.js';

// Fixed reference time so date math is deterministic: June 11, 2026, 10:00 local
const NOW = new Date(2026, 5, 11, 10, 0, 0);

// ─── escaping ────────────────────────────────────────────────────────────────

describe('escapeHTML', () => {
  it('escapes &, <, >, and "', () => {
    expect(escapeHTML('a & b <i>"hi"</i>')).toBe('a &amp; b &lt;i&gt;&quot;hi&quot;&lt;/i&gt;');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHTML('Monthly Board Meeting')).toBe('Monthly Board Meeting');
  });

  it('neutralizes a script tag', () => {
    expect(escapeHTML('<script>alert(1)</script>')).not.toContain('<script>');
  });
});

describe('escapeAttr', () => {
  it('escapes &, ", \', and <', () => {
    expect(escapeAttr(`O'Brien & "co" <x>`)).toBe('O&#39;Brien &amp; &quot;co&quot; &lt;x>');
  });

  it('prevents breaking out of a single-quoted onclick attribute', () => {
    expect(escapeAttr("Room 'A'")).not.toContain("'");
  });
});

// ─── relativeDayLabel ────────────────────────────────────────────────────────

describe('relativeDayLabel', () => {
  it('returns "Today" for the current date', () => {
    expect(relativeDayLabel('2026-06-11', NOW)).toBe('Today');
  });

  it('returns "Today" regardless of the time of day', () => {
    expect(relativeDayLabel('2026-06-11', new Date(2026, 5, 11, 23, 59))).toBe('Today');
  });

  it('returns "Tomorrow" for the next day', () => {
    expect(relativeDayLabel('2026-06-12', NOW)).toBe('Tomorrow');
  });

  it('returns a short date for later days', () => {
    expect(relativeDayLabel('2026-06-16', NOW)).toBe('Jun 16');
  });

  it('returns null for past dates', () => {
    expect(relativeDayLabel('2026-06-10', NOW)).toBeNull();
  });

  it('handles dates in a different month', () => {
    expect(relativeDayLabel('2026-07-01', NOW)).toBe('Jul 1');
  });
});

// ─── buildMeetingItem ────────────────────────────────────────────────────────

describe('buildMeetingItem', () => {
  const tbd = { day: 'TBD', month: 'Jul', title: 'Monthly Board Meeting', detail: 'Community Room' };

  it('renders day, month, and title', () => {
    const html = buildMeetingItem(tbd);
    expect(html).toContain('<div class="day">TBD</div>');
    expect(html).toContain('<div class="month">Jul</div>');
    expect(html).toContain('Monthly Board Meeting');
  });

  it('adds the "next" class only when next is set', () => {
    expect(buildMeetingItem({ ...tbd, next: true })).toContain('class="meeting-date next"');
    expect(buildMeetingItem(tbd)).toContain('class="meeting-date"');
  });

  it('renders an escaped badge when present', () => {
    const html = buildMeetingItem({ ...tbd, badge: 'All <residents>' });
    expect(html).toContain('<span class="badge">All &lt;residents&gt;</span>');
  });

  it('omits the badge span when no badge is set', () => {
    expect(buildMeetingItem(tbd)).not.toContain('class="badge"');
  });

  it('escapes HTML in the title', () => {
    const html = buildMeetingItem({ ...tbd, title: 'AGM <b>2026</b>' });
    expect(html).toContain('AGM &lt;b&gt;2026&lt;/b&gt;');
  });

  it('omits the calendar button when no calendar info exists', () => {
    expect(buildMeetingItem(tbd)).not.toContain('cal-btn');
  });

  it('renders a calendar button with date, location, and times', () => {
    const html = buildMeetingItem({
      day: '15', month: 'Jul', title: 'Board Meeting', detail: '7pm',
      isoDate: '2026-07-15',
      calendar: { location: 'Community Room', startTime: '19:00', endTime: '20:30' },
    });
    expect(html).toContain('cal-btn');
    expect(html).toContain("addToCalendar('2026-07-15'");
    expect(html).toContain('Community Room');
    expect(html).toContain("'19:00','20:30'");
  });

  it('escapes quotes in calendar onclick arguments', () => {
    const html = buildMeetingItem({
      day: '15', month: 'Jul', title: "Owners' Meeting", detail: '',
      isoDate: '2026-07-15',
      calendar: { location: "Bob's Room", startTime: '19:00', endTime: '20:00' },
    });
    expect(html).toContain('Owners&#39; Meeting');
    expect(html).toContain('Bob&#39;s Room');
  });
});

// ─── buildUpdateCard ─────────────────────────────────────────────────────────

describe('buildUpdateCard', () => {
  const base = { date: 'June 2026', category: 'general', title: 'Hello', body: 'World' };

  it('renders title, body, date, and category attribute', () => {
    const html = buildUpdateCard(base, NOW);
    expect(html).toContain('data-category="general"');
    expect(html).toContain('<h4>Hello</h4>');
    expect(html).toContain('<p>World</p>');
    expect(html).toContain('June 2026');
  });

  it('maps known categories to display labels', () => {
    expect(buildUpdateCard(base, NOW)).toContain('General Notice');
    expect(buildUpdateCard({ ...base, category: 'safety' }, NOW)).toContain('Safety Notice');
  });

  it('falls back to the raw category for unknown categories', () => {
    expect(buildUpdateCard({ ...base, category: 'plumbing' }, NOW)).toContain('· plumbing');
  });

  it('escapes HTML in title and body', () => {
    const html = buildUpdateCard({ ...base, title: '<img src=x>', body: 'a & b' }, NOW);
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).toContain('a &amp; b');
  });

  it('renders a relative badge with data-event-date for an upcoming eventDate', () => {
    const html = buildUpdateCard({ ...base, eventDate: '2026-06-12' }, NOW);
    expect(html).toContain('data-event-date="2026-06-12"');
    expect(html).toContain('>Tomorrow</span>');
  });

  it('renders no badge when eventDate is in the past', () => {
    const html = buildUpdateCard({ ...base, eventDate: '2026-06-01' }, NOW);
    expect(html).not.toContain('badge');
  });

  it('uses the static badge when no eventDate is set', () => {
    const html = buildUpdateCard({ ...base, badge: 'Action <b>Required</b>' }, NOW);
    expect(html).toContain('<span class="badge">Action &lt;b&gt;Required&lt;/b&gt;</span>');
  });

  it('prefers eventDate over a static badge', () => {
    const html = buildUpdateCard({ ...base, eventDate: '2026-06-11', badge: 'Static' }, NOW);
    expect(html).toContain('>Today</span>');
    expect(html).not.toContain('Static');
  });
});

// ─── buildFilterButtons ──────────────────────────────────────────────────────

describe('buildFilterButtons', () => {
  it('always renders the "All" button first, marked active', () => {
    const html = buildFilterButtons([]);
    expect(html).toContain('data-filter="all"');
    expect(html.indexOf('All')).toBeGreaterThan(-1);
    expect(html).toContain('filter-btn active');
  });

  it('renders one button per unique category, preserving first-seen order', () => {
    const html = buildFilterButtons([
      { category: 'maintenance' }, { category: 'safety' },
      { category: 'maintenance' }, { category: 'general' },
    ]);
    const matches = [...html.matchAll(/data-filter="(\w+)"/g)].map(m => m[1]);
    expect(matches).toEqual(['all', 'maintenance', 'safety', 'general']);
  });

  it('uses display labels for known categories', () => {
    expect(buildFilterButtons([{ category: 'reminder' }])).toContain('>Reminder<');
  });

  it('capitalizes unknown categories', () => {
    expect(buildFilterButtons([{ category: 'plumbing' }])).toContain('>Plumbing<');
  });
});

// ─── notice bar ──────────────────────────────────────────────────────────────

describe('noticeState', () => {
  it('is active when enabled with a message and no expiry', () => {
    expect(noticeState({ active: true, message: 'Hi' }, NOW)).toEqual({ active: true, expired: false });
  });

  it('is inactive when active is false', () => {
    expect(noticeState({ active: false, message: 'Hi' }, NOW).active).toBe(false);
  });

  it('is inactive when the message is empty', () => {
    expect(noticeState({ active: true, message: '' }, NOW).active).toBe(false);
  });

  it('is expired once the expiry time has passed', () => {
    const s = noticeState({ active: true, message: 'Hi', expires: '2026-06-10T14:00' }, NOW);
    expect(s).toEqual({ active: false, expired: true });
  });

  it('treats the exact expiry instant as expired', () => {
    const s = noticeState({ active: true, message: 'Hi', expires: '2026-06-11T10:00' }, new Date(2026, 5, 11, 10, 0, 0));
    expect(s.expired).toBe(true);
  });

  it('is not expired before the expiry time', () => {
    const s = noticeState({ active: true, message: 'Hi', expires: '2026-06-12T14:00' }, NOW);
    expect(s).toEqual({ active: true, expired: false });
  });
});

describe('buildNoticeBar', () => {
  const notice = { active: true, type: 'warning', message: 'Elevator out', dismissible: true };

  it('returns an empty string when inactive', () => {
    expect(buildNoticeBar({ active: false, type: 'info', message: 'x' }, NOW)).toBe('');
  });

  it('returns an empty string when expired', () => {
    expect(buildNoticeBar({ ...notice, expires: '2026-06-01T00:00' }, NOW)).toBe('');
  });

  it('renders the type class, icon, and escaped message', () => {
    const html = buildNoticeBar({ ...notice, message: 'Water <off>' }, NOW);
    expect(html).toContain('notice-bar notice-warning');
    expect(html).toContain('⚠️');
    expect(html).toContain('Water &lt;off&gt;');
  });

  it('falls back to the info icon for unknown types', () => {
    expect(buildNoticeBar({ ...notice, type: 'party' }, NOW)).toContain('ℹ️');
  });

  it('includes a dismiss button only when dismissible', () => {
    expect(buildNoticeBar(notice, NOW)).toContain('notice-bar-close');
    expect(buildNoticeBar({ ...notice, dismissible: false }, NOW)).not.toContain('notice-bar-close');
  });

  it('embeds a data-expires attribute for client-side auto-hide', () => {
    const html = buildNoticeBar({ ...notice, expires: '2026-06-12T14:00' }, NOW);
    expect(html).toContain('data-expires="2026-06-12T14:00"');
  });

  it('omits data-expires when no expiry is set', () => {
    expect(buildNoticeBar(notice, NOW)).not.toContain('data-expires');
  });
});

// ─── nextMeetingTile ─────────────────────────────────────────────────────────

describe('nextMeetingTile', () => {
  const dated = (isoDate, extra = {}) => ({
    day: '15', month: 'Jul', title: 'Board Meeting', detail: '', isoDate, ...extra,
  });

  it('returns "Date TBD" when there are no meetings', () => {
    expect(nextMeetingTile([], NOW)).toBe('Date TBD');
  });

  it('falls back to "<month> · Date TBD" when no meeting has an isoDate', () => {
    expect(nextMeetingTile([{ day: 'TBD', month: 'Jul', title: 'X' }], NOW)).toBe('Jul · Date TBD');
  });

  it('renders the first upcoming dated meeting', () => {
    const tile = nextMeetingTile([dated('2026-07-15')], NOW);
    expect(tile).toBe('Jul 15 · Board Meeting');
  });

  it('skips meetings that have already ended', () => {
    const tile = nextMeetingTile([dated('2026-06-01'), dated('2026-07-15')], NOW);
    expect(tile).toContain('Jul 15');
  });

  it('keeps a same-day meeting until its end time passes', () => {
    const cal = { location: 'Rm', startTime: '09:00', endTime: '11:00' };
    // NOW is 10:00 — the 09:00–11:00 meeting today is still on
    expect(nextMeetingTile([dated('2026-06-11', { calendar: cal })], NOW)).toContain('Board Meeting');
    // …but by 12:00 it has ended; the TBD fallback uses the first meeting's month
    expect(nextMeetingTile([dated('2026-06-11', { calendar: cal }), { day: 'TBD', month: 'Aug', title: 'Y' }], new Date(2026, 5, 11, 12, 0))).toBe('Jul · Date TBD');
  });

  it('treats a dated meeting without calendar times as lasting all day', () => {
    // No calendar → end-of-day fallback, so it still counts late in the day
    const tile = nextMeetingTile([dated('2026-06-11')], new Date(2026, 5, 11, 22, 0));
    expect(tile).toContain('Board Meeting');
  });

  it('adds a countdown chip only when calendar times exist', () => {
    const cal = { location: 'Rm', startTime: '19:00', endTime: '20:30' };
    const withCal = nextMeetingTile([dated('2026-07-15', { calendar: cal })], NOW);
    expect(withCal).toContain('id="meeting-countdown"');
    expect(withCal).toContain('data-start="2026-07-15T19:00:00"');
    expect(withCal).toContain('data-end="2026-07-15T20:30:00"');
    expect(nextMeetingTile([dated('2026-07-15')], NOW)).not.toContain('meeting-countdown');
  });

  it('escapes HTML in the meeting title', () => {
    const tile = nextMeetingTile([dated('2026-07-15', { title: 'AGM <b>!</b>' })], NOW);
    expect(tile).toContain('AGM &lt;b&gt;!&lt;/b&gt;');
  });
});
