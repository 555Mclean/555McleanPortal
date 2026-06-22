import { describe, it, expect } from 'vitest';
import {
  escapeHTML, escapeAttr, CATEGORY_LABELS,
  buildMeetingItem, buildUpdateCard, buildFilterButtons,
  buildNoticeHTML, nextMeetingTile, replaceRegion,
} from '../lib/build-lib.js';

const NOW = new Date(2026, 5, 22, 12, 0, 0); // June 22 2026, noon

// ─── escaping (the only XSS defense for JSON-sourced content) ─────────────────

describe('escapeHTML', () => {
  it('escapes the HTML-significant characters', () => {
    expect(escapeHTML('<b>"Tom & Jerry"</b>'))
      .toBe('&lt;b&gt;&quot;Tom &amp; Jerry&quot;&lt;/b&gt;');
  });

  it('neutralizes a script-injection attempt', () => {
    const out = escapeHTML('<script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('escapes ampersands before other entities (no double-escaping)', () => {
    expect(escapeHTML('&amp;')).toBe('&amp;amp;');
  });
});

describe('escapeAttr', () => {
  it('escapes quotes and angle brackets used to break out of attributes', () => {
    expect(escapeAttr(`" onmouseover="evil()`))
      .toBe('&quot; onmouseover=&quot;evil()');
  });

  it('escapes single quotes', () => {
    expect(escapeAttr("O'Brien")).toBe('O&#39;Brien');
  });
});

// ─── buildMeetingItem ────────────────────────────────────────────────────────

describe('buildMeetingItem', () => {
  const meeting = { day: '15', month: 'Jul', title: 'Board Meeting', detail: 'Community Room' };

  it('renders the day, month, and title', () => {
    const html = buildMeetingItem(meeting);
    expect(html).toContain('<div class="day">15</div>');
    expect(html).toContain('<div class="month">Jul</div>');
    expect(html).toContain('Board Meeting');
  });

  it('adds the "next" modifier class when next is true', () => {
    expect(buildMeetingItem({ ...meeting, next: true })).toContain('meeting-date next');
  });

  it('omits the "next" class otherwise', () => {
    expect(buildMeetingItem(meeting)).not.toContain('meeting-date next');
  });

  it('renders a badge span when a badge is present', () => {
    expect(buildMeetingItem({ ...meeting, badge: 'Annual' }))
      .toContain('<span class="badge">Annual</span>');
  });

  it('escapes the title to prevent injection', () => {
    expect(buildMeetingItem({ ...meeting, title: '<img src=x onerror=alert(1)>' }))
      .toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('renders an Add to Calendar button only when calendar data exists', () => {
    expect(buildMeetingItem(meeting)).not.toContain('cal-btn');
    const withCal = buildMeetingItem({
      ...meeting, isoDate: '2026-07-15',
      calendar: { location: 'Community Room', startTime: '18:30', endTime: '20:00' },
    });
    expect(withCal).toContain('addToCalendar(');
    expect(withCal).toContain('2026-07-15');
  });
});

// ─── buildUpdateCard ─────────────────────────────────────────────────────────

describe('buildUpdateCard', () => {
  const update = { date: 'June 2026', category: 'general', title: 'Welcome', body: 'Hello residents.' };

  it('maps a known category to its friendly label', () => {
    expect(buildUpdateCard(update, NOW)).toContain('General Notice');
  });

  it('falls back to the raw category when unknown', () => {
    expect(buildUpdateCard({ ...update, category: 'weird' }, NOW)).toContain('· weird');
  });

  it('sets the data-category attribute for client-side filtering', () => {
    expect(buildUpdateCard(update, NOW)).toContain('data-category="general"');
  });

  it('escapes the title and body', () => {
    const html = buildUpdateCard({ ...update, title: '<x>', body: 'a & b' }, NOW);
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('a &amp; b');
  });

  it('renders a static badge when one is provided', () => {
    expect(buildUpdateCard({ ...update, badge: 'Policy' }, NOW))
      .toContain('<span class="badge">Policy</span>');
  });

  it('renders a relative event badge for a future eventDate', () => {
    const html = buildUpdateCard({ ...update, eventDate: '2026-06-23' }, NOW);
    expect(html).toContain('data-event-date="2026-06-23"');
    expect(html).toContain('Tomorrow');
  });

  it('omits the event badge entirely when the eventDate is in the past', () => {
    const html = buildUpdateCard({ ...update, eventDate: '2026-06-01' }, NOW);
    expect(html).not.toContain('data-event-date');
  });

  it('prefers the eventDate badge over a static badge', () => {
    const html = buildUpdateCard({ ...update, eventDate: '2026-06-22', badge: 'Policy' }, NOW);
    expect(html).toContain('Today');
    expect(html).not.toContain('Policy');
  });
});

// ─── buildFilterButtons ──────────────────────────────────────────────────────

describe('buildFilterButtons', () => {
  it('always starts with an active "All" button', () => {
    const html = buildFilterButtons([{ category: 'general' }]);
    expect(html).toContain('data-filter="all"');
    expect(html).toContain('filter-btn active');
  });

  it('creates one button per unique category, preserving first-seen order', () => {
    const html = buildFilterButtons([
      { category: 'safety' }, { category: 'general' }, { category: 'safety' },
    ]);
    expect(html).toContain('data-filter="safety"');
    expect(html).toContain('data-filter="general"');
    // "safety" appears once as a filter button (plus nothing else)
    expect(html.match(/data-filter="safety"/g)).toHaveLength(1);
  });

  it('uses friendly labels for known categories and capitalizes unknown ones', () => {
    const html = buildFilterButtons([{ category: 'safety' }, { category: 'custom' }]);
    expect(html).toContain('>Safety Notice<');
    expect(html).toContain('>Custom<');
  });

  it('returns just the All button for an empty update list', () => {
    const html = buildFilterButtons([]);
    expect(html).toContain('data-filter="all"');
    expect(html).not.toContain('data-filter="safety"');
  });
});

// ─── buildNoticeHTML ─────────────────────────────────────────────────────────

describe('buildNoticeHTML', () => {
  const active = { active: true, type: 'warning', message: 'Heads up', dismissible: true };

  it('returns empty html and active:false when the notice is inactive', () => {
    const r = buildNoticeHTML({ ...active, active: false }, NOW);
    expect(r.html).toBe('');
    expect(r.active).toBe(false);
  });

  it('returns empty html when there is no message', () => {
    expect(buildNoticeHTML({ ...active, message: '' }, NOW).html).toBe('');
  });

  it('renders the message and the matching icon when active', () => {
    const r = buildNoticeHTML(active, NOW);
    expect(r.active).toBe(true);
    expect(r.html).toContain('Heads up');
    expect(r.html).toContain('⚠️');
    expect(r.html).toContain('notice-warning');
  });

  it('includes a dismiss button only when dismissible', () => {
    expect(buildNoticeHTML(active, NOW).html).toContain('dismissNotice()');
    expect(buildNoticeHTML({ ...active, dismissible: false }, NOW).html).not.toContain('dismissNotice()');
  });

  it('escapes the message to prevent injection', () => {
    expect(buildNoticeHTML({ ...active, message: '<x>' }, NOW).html).toContain('&lt;x&gt;');
  });

  it('marks a notice with a past expiry as expired and inactive', () => {
    const r = buildNoticeHTML({ ...active, expires: '2026-06-01T00:00' }, NOW);
    expect(r.expired).toBe(true);
    expect(r.active).toBe(false);
    expect(r.html).toBe('');
  });

  it('keeps a notice with a future expiry active and emits data-expires', () => {
    const r = buildNoticeHTML({ ...active, expires: '2026-12-31T00:00' }, NOW);
    expect(r.active).toBe(true);
    expect(r.html).toContain('data-expires="2026-12-31T00:00"');
  });

  it('falls back to the info icon for an unknown type', () => {
    expect(buildNoticeHTML({ ...active, type: 'bogus' }, NOW).html).toContain('ℹ️');
  });
});

// ─── nextMeetingTile ─────────────────────────────────────────────────────────

describe('nextMeetingTile', () => {
  it('returns "Date TBD" when there are no meetings', () => {
    expect(nextMeetingTile([], NOW)).toBe('Date TBD');
  });

  it('falls back to "<month> · Date TBD" when no meeting has an isoDate', () => {
    expect(nextMeetingTile([{ month: 'Jul', day: 'TBD', title: 'Board' }], NOW))
      .toBe('Jul · Date TBD');
  });

  it('selects the first meeting whose date has not yet passed', () => {
    const tile = nextMeetingTile([
      { month: 'Jun', day: '1', title: 'Past', isoDate: '2026-06-01' },
      { month: 'Jul', day: '15', title: 'Upcoming', isoDate: '2026-07-15' },
    ], NOW);
    expect(tile).toContain('Jul 15 · Upcoming');
  });

  it('renders a countdown chip with start/end data when calendar times exist', () => {
    const tile = nextMeetingTile([{
      month: 'Jul', day: '15', title: 'Board', isoDate: '2026-07-15',
      calendar: { startTime: '18:30', endTime: '20:00' },
    }], NOW);
    expect(tile).toContain('id="meeting-countdown"');
    expect(tile).toContain('data-start="2026-07-15T18:30:00"');
    expect(tile).toContain('data-end="2026-07-15T20:00:00"');
  });

  it('omits the chip when the meeting has no calendar times', () => {
    const tile = nextMeetingTile([
      { month: 'Jul', day: '15', title: 'Board', isoDate: '2026-07-15' },
    ], NOW);
    expect(tile).not.toContain('meeting-countdown');
  });

  it('treats a meeting earlier today (before end time) as still upcoming', () => {
    const tile = nextMeetingTile([
      { month: 'Jun', day: '22', title: 'Tonight', isoDate: '2026-06-22',
        calendar: { startTime: '18:30', endTime: '20:00' } },
    ], NOW);
    expect(tile).toContain('Tonight');
  });

  it('escapes the meeting title', () => {
    const tile = nextMeetingTile([
      { month: 'Jul', day: '15', title: '<x>', isoDate: '2026-07-15' },
    ], NOW);
    expect(tile).toContain('&lt;x&gt;');
  });
});

// ─── replaceRegion ───────────────────────────────────────────────────────────

describe('replaceRegion', () => {
  it('replaces the matched region', () => {
    const out = replaceRegion('a<!-- M -->b', /<!-- M -->/, 'X', 'M');
    expect(out).toBe('aXb');
  });

  it('throws a descriptive error when the marker is missing', () => {
    expect(() => replaceRegion('no markers', /<!-- M -->/, 'X', 'M'))
      .toThrow(/M marker/);
  });
});
