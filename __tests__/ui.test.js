import { describe, it, expect } from 'vitest';
import {
  relativeDateLabel, countdownLabel, prefersDarkDefault,
  updateCardMatches, buildICS,
} from '../ui.js';

const NOW = new Date(2026, 5, 24, 12, 0, 0); // 2026-06-24 12:00 local

// ─── relativeDateLabel ─────────────────────────────────────────────────────────

describe('relativeDateLabel', () => {
  it('returns "Today" for the current date', () => {
    expect(relativeDateLabel('2026-06-24', NOW)).toBe('Today');
  });

  it('returns "Tomorrow" for the next day', () => {
    expect(relativeDateLabel('2026-06-25', NOW)).toBe('Tomorrow');
  });

  it('returns a short month/day label further out', () => {
    expect(relativeDateLabel('2026-07-04', NOW)).toBe('Jul 4');
  });

  it('returns null for past dates so the caller can remove the badge', () => {
    expect(relativeDateLabel('2026-06-23', NOW)).toBeNull();
  });

  it('ignores the time of day on "now" (late-evening still counts as today)', () => {
    expect(relativeDateLabel('2026-06-24', new Date(2026, 5, 24, 23, 59))).toBe('Today');
  });
});

// ─── countdownLabel ────────────────────────────────────────────────────────────

describe('countdownLabel', () => {
  const start = new Date(2026, 5, 25, 19, 0, 0);
  const end   = new Date(2026, 5, 25, 20, 0, 0);

  it('returns null once the event has ended', () => {
    expect(countdownLabel(start, end, new Date(2026, 5, 25, 20, 1))).toBeNull();
  });

  it('returns "Happening Now" between start and end', () => {
    expect(countdownLabel(start, end, new Date(2026, 5, 25, 19, 30))).toBe('Happening Now');
  });

  it('shows days and hours when more than a day out', () => {
    expect(countdownLabel(start, end, new Date(2026, 5, 23, 12, 0))).toBe('in 2d 7h');
  });

  it('shows hours and minutes when less than a day out', () => {
    expect(countdownLabel(start, end, new Date(2026, 5, 25, 16, 30))).toBe('in 2h 30m');
  });

  it('shows only minutes when less than an hour out', () => {
    expect(countdownLabel(start, end, new Date(2026, 5, 25, 18, 45))).toBe('in 15m');
  });
});

// ─── prefersDarkDefault ────────────────────────────────────────────────────────

describe('prefersDarkDefault', () => {
  it('honors a saved "dark" choice regardless of OS preference', () => {
    expect(prefersDarkDefault('dark', false)).toBe(true);
  });

  it('honors a saved "light" choice regardless of OS preference', () => {
    expect(prefersDarkDefault('light', true)).toBe(false);
  });

  it('falls back to the OS preference when nothing is saved', () => {
    expect(prefersDarkDefault(null, true)).toBe(true);
    expect(prefersDarkDefault(null, false)).toBe(false);
  });
});

// ─── updateCardMatches ─────────────────────────────────────────────────────────

describe('updateCardMatches', () => {
  it('matches everything when category is "all" and there is no query', () => {
    expect(updateCardMatches('Roof work', 'general', 'all', '')).toBe(true);
  });

  it('filters by category', () => {
    expect(updateCardMatches('Roof work', 'general', 'safety', '')).toBe(false);
    expect(updateCardMatches('Roof work', 'safety', 'safety', '')).toBe(true);
  });

  it('filters by case-insensitive substring query', () => {
    expect(updateCardMatches('Roof Work Begins', 'general', 'all', 'roof')).toBe(true);
    expect(updateCardMatches('Roof Work Begins', 'general', 'all', 'boiler')).toBe(false);
  });

  it('requires both category and query to match', () => {
    expect(updateCardMatches('Roof work', 'general', 'safety', 'roof')).toBe(false);
    expect(updateCardMatches('Roof work', 'safety', 'safety', 'roof')).toBe(true);
  });
});

// ─── buildICS ──────────────────────────────────────────────────────────────────

describe('buildICS', () => {
  const STAMP = new Date(Date.UTC(2026, 5, 24, 9, 5, 7));

  it('wraps a single VEVENT in a VCALENDAR', () => {
    const ics = buildICS('2026-06-08', 'Board Meeting', 'Lobby', '19:00', '20:00', STAMP);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('formats DTSTART/DTEND from the date and times', () => {
    const ics = buildICS('2026-06-08', 'Board Meeting', 'Lobby', '19:00', '20:00', STAMP);
    expect(ics).toContain('DTSTART:20260608T190000');
    expect(ics).toContain('DTEND:20260608T200000');
  });

  it('formats DTSTAMP as a zero-padded UTC timestamp', () => {
    const ics = buildICS('2026-06-08', 'Board Meeting', 'Lobby', '19:00', '20:00', STAMP);
    expect(ics).toContain('DTSTAMP:20260624T090507Z');
  });

  it('derives a stable UID from the date and start time', () => {
    const ics = buildICS('2026-06-08', 'Board Meeting', 'Lobby', '19:00', '20:00', STAMP);
    expect(ics).toContain('UID:2026-06-08T1900@555mclean.github.io');
  });

  it('escapes commas, semicolons and backslashes in text fields', () => {
    const ics = buildICS('2026-06-08', 'Meeting, Q&A; notes', 'Lobby \\ Hall', '19:00', '20:00', STAMP);
    expect(ics).toContain('SUMMARY:Meeting\\, Q&A\\; notes');
    expect(ics).toContain('LOCATION:Lobby \\\\ Hall');
  });

  it('uses CRLF line endings as required by RFC 5545', () => {
    const ics = buildICS('2026-06-08', 'Board Meeting', 'Lobby', '19:00', '20:00', STAMP);
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
    expect(ics).not.toContain('\n\n');
  });
});
