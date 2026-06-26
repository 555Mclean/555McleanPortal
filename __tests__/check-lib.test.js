import { describe, it, expect } from 'vitest';
import {
  parseLocalDate, upcomingMeetings, findPlaceholders, PLACEHOLDER_CHECKS,
} from '../scripts/check-lib.mjs';

// ─── parseLocalDate ────────────────────────────────────────────────────────────

describe('parseLocalDate', () => {
  it('parses an ISO date into a local Date at midnight', () => {
    const d = parseLocalDate('2026-06-24');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // June (0-indexed)
    expect(d.getDate()).toBe(24);
    expect(d.getHours()).toBe(0);
  });

  it('does not shift the day across timezones (local, not UTC)', () => {
    // new Date('2026-06-24') would parse as UTC midnight and can roll back a day
    // in negative-offset zones; parseLocalDate must keep the 24th.
    expect(parseLocalDate('2026-06-24').getDate()).toBe(24);
  });
});

// ─── upcomingMeetings ──────────────────────────────────────────────────────────

describe('upcomingMeetings', () => {
  const today = new Date(2026, 5, 24); // 2026-06-24 local midnight

  it('keeps meetings dated today or later', () => {
    const meetings = [
      { title: 'Today', isoDate: '2026-06-24' },
      { title: 'Future', isoDate: '2026-07-08' },
    ];
    expect(upcomingMeetings(meetings, today)).toHaveLength(2);
  });

  it('drops meetings dated before today', () => {
    const meetings = [
      { title: 'Past', isoDate: '2026-06-01' },
      { title: 'Future', isoDate: '2026-07-08' },
    ];
    const result = upcomingMeetings(meetings, today);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Future');
  });

  it('ignores meetings without a confirmed isoDate', () => {
    const meetings = [
      { title: 'TBD' },
      { title: 'Future', isoDate: '2026-07-08' },
    ];
    expect(upcomingMeetings(meetings, today)).toHaveLength(1);
  });

  it('returns an empty array when nothing is upcoming', () => {
    expect(upcomingMeetings([{ title: 'Past', isoDate: '2020-01-01' }], today)).toEqual([]);
  });
});

// ─── findPlaceholders ──────────────────────────────────────────────────────────

describe('findPlaceholders', () => {
  it('returns nothing for clean HTML', () => {
    expect(findPlaceholders('<p>board@555mclean.org · (914) 123-4567</p>')).toEqual([]);
  });

  it('flags each placeholder present in the HTML', () => {
    const html = 'mailto:board@example.com and call (914) 555-0000';
    const found = findPlaceholders(html);
    expect(found).toHaveLength(2);
    expect(found.some(d => d.includes('Board email'))).toBe(true);
    expect(found.some(d => d.includes('Emergency phone'))).toBe(true);
  });

  it('detects the managing-agent name placeholder', () => {
    expect(findPlaceholders('<td>Name &amp; contact to be confirmed</td>'))
      .toContain('Managing agent name is still set to "Name & contact to be confirmed"');
  });

  it('accepts a custom checks list', () => {
    const checks = [{ needle: 'TODO', desc: 'todo marker present' }];
    expect(findPlaceholders('a TODO here', checks)).toEqual(['todo marker present']);
  });

  it('ships with one description per built-in check', () => {
    expect(PLACEHOLDER_CHECKS).toHaveLength(4);
    for (const c of PLACEHOLDER_CHECKS) {
      expect(c).toHaveProperty('needle');
      expect(c).toHaveProperty('desc');
    }
  });
});
