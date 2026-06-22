import { describe, it, expect } from 'vitest';
import { findPlaceholders, PLACEHOLDER_CHECKS } from '../scripts/check-placeholders.mjs';
import { parseLocalDate, findUpcomingMeetings } from '../scripts/check-stale.mjs';

describe('findPlaceholders', () => {
  it('reports nothing for clean markup', () => {
    expect(findPlaceholders('<html>board@555mclean.org</html>')).toEqual([]);
  });

  it('flags a placeholder email that is still present', () => {
    const found = findPlaceholders('contact board@example.com today');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/board@example\.com/);
  });

  it('flags multiple placeholders at once', () => {
    const html = 'board@example.com / info@example.com / (914) 555-0000';
    expect(findPlaceholders(html)).toHaveLength(3);
  });

  it('detects the HTML-escaped managing-agent placeholder', () => {
    const html = 'Name &amp; contact to be confirmed';
    expect(findPlaceholders(html)).toHaveLength(1);
  });

  it('every built-in check has a needle and a description', () => {
    for (const c of PLACEHOLDER_CHECKS) {
      expect(typeof c.needle).toBe('string');
      expect(c.needle.length).toBeGreaterThan(0);
      expect(typeof c.desc).toBe('string');
    }
  });
});

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD into a local date (no UTC offset surprises)', () => {
    const d = parseLocalDate('2026-07-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July is 6
    expect(d.getDate()).toBe(15);
  });
});

describe('findUpcomingMeetings', () => {
  const today = new Date(2026, 5, 22, 12, 0, 0); // June 22 2026
  const meetings = [
    { isoDate: '2026-06-01', title: 'Past' },
    { isoDate: '2026-06-22', title: 'Today' },
    { isoDate: '2026-07-15', title: 'Future' },
    { title: 'Undated' },
  ];

  it('includes meetings dated today or later', () => {
    const titles = findUpcomingMeetings(meetings, today).map(m => m.title);
    expect(titles).toContain('Today');
    expect(titles).toContain('Future');
  });

  it('excludes meetings whose date has passed', () => {
    expect(findUpcomingMeetings(meetings, today).map(m => m.title)).not.toContain('Past');
  });

  it('excludes meetings without a confirmed isoDate', () => {
    expect(findUpcomingMeetings(meetings, today).map(m => m.title)).not.toContain('Undated');
  });

  it('returns an empty array when everything is stale', () => {
    const stale = [{ isoDate: '2020-01-01', title: 'Old' }, { title: 'TBD' }];
    expect(findUpcomingMeetings(stale, today)).toEqual([]);
  });
});
