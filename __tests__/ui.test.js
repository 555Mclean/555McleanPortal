import { describe, it, expect } from 'vitest';
import {
  relativeDateLabel, countdownLabel, prefersDarkDefault,
  updateCardMatches, buildICS,
  nthWeekday, easterSunday, holidayGreeting, HOLIDAYS, OBSERVANCE_DATES,
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

// ─── Holiday greetings ─────────────────────────────────────────────────────────

describe('nthWeekday', () => {
  it('finds the 3rd Monday of January 2026 (MLK Day)', () => {
    expect(nthWeekday(2026, 1, 1, 3)).toBe(19);
  });

  it('finds the 4th Thursday of November 2026 (Thanksgiving)', () => {
    expect(nthWeekday(2026, 11, 4, 4)).toBe(26);
  });

  it('finds the last Monday of May 2026 (Memorial Day)', () => {
    expect(nthWeekday(2026, 5, 1, -1)).toBe(25);
  });

  it('handles a month that opens on the target weekday', () => {
    // 2026-06-01 is a Monday, so the 1st Monday is the 1st.
    expect(nthWeekday(2026, 6, 1, 1)).toBe(1);
  });
});

describe('easterSunday', () => {
  it.each([
    [2025, [4, 20]],
    [2026, [4, 5]],
    [2027, [3, 28]],
    [2028, [4, 16]],
  ])('computes Easter %i', (year, expected) => {
    expect(easterSunday(year)).toEqual(expected);
  });
});

describe('holidayGreeting', () => {
  const on = (y, m, d) => holidayGreeting(new Date(y, m - 1, d, 9, 0));

  it('says Merry Christmas on December 25', () => {
    expect(on(2026, 12, 25)).toMatchObject({ name: 'Christmas', message: 'Merry Christmas' });
  });

  it('starts the Christmas greeting during the lead-up days', () => {
    expect(on(2026, 12, 21).name).toBe('Christmas');
    expect(on(2026, 12, 20)).toBeNull();
  });

  it('returns null on an ordinary day', () => {
    expect(on(2026, 6, 24)).toBeNull();
  });

  it('covers fixed-date holidays', () => {
    expect(on(2026, 7, 4).message).toBe('Happy Fourth of July');
    expect(on(2026, 10, 31).message).toBe('Happy Halloween');
    expect(on(2026, 1, 1).message).toBe('Happy New Year');
  });

  it('covers holidays that float to a weekday', () => {
    expect(on(2026, 11, 26).name).toBe('Thanksgiving');   // 4th Thursday
    expect(on(2026, 5, 25).name).toBe('Memorial Day');    // last Monday
    expect(on(2026, 4, 5).name).toBe('Easter');
  });

  it('keeps a multi-day observance up for its whole span', () => {
    expect(on(2026, 12, 28).name).toBe('Kwanzaa');        // Kwanzaa runs Dec 26–Jan 1
    expect(on(2027, 1, 2)).toBeNull();
  });

  it("prefers the day-of greeting when an observance overlaps it", () => {
    // Jan 1 falls inside Kwanzaa, but New Year's Day is the greeting of the day.
    expect(on(2027, 1, 1).name).toBe("New Year's Day");
  });

  it('is silent for an observance with no date on file that year', () => {
    const missing = [{ name: 'Test', message: 'Hi', emoji: '👋', on: () => null }];
    expect(holidayGreeting(new Date(2026, 0, 5), missing)).toBeNull();
  });

  it('ignores the time of day', () => {
    expect(holidayGreeting(new Date(2026, 11, 25, 23, 59)).name).toBe('Christmas');
  });
});

describe('HOLIDAYS table', () => {
  it('gives every entry a name, message and emoji', () => {
    for (const h of HOLIDAYS) {
      expect(h.name, JSON.stringify(h)).toBeTruthy();
      expect(h.message, h.name).toBeTruthy();
      expect(h.emoji, h.name).toBeTruthy();
      expect(typeof h.on, h.name).toBe('function');
    }
  });

  it('resolves to a valid month and day for every year it has a date', () => {
    for (const year of [2026, 2027, 2028]) {
      for (const h of HOLIDAYS) {
        const md = h.on(year);
        if (!md) continue;
        const [month, day] = md;
        expect(month, `${h.name} ${year}`).toBeGreaterThanOrEqual(1);
        expect(month, `${h.name} ${year}`).toBeLessThanOrEqual(12);
        expect(day, `${h.name} ${year}`).toBeGreaterThanOrEqual(1);
        expect(day, `${h.name} ${year}`).toBeLessThanOrEqual(new Date(year, month, 0).getDate());
      }
    }
  });

  it('has an entry in HOLIDAYS for every observance table key', () => {
    const names = HOLIDAYS.map(h => h.name);
    for (const key of Object.keys(OBSERVANCE_DATES)) expect(names).toContain(key);
  });
});
