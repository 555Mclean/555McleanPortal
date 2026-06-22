import { describe, it, expect } from 'vitest';
import { eventBadgeLabel, countdownLabel } from '../lib/dates.js';

// A fixed "now" so the relative math is deterministic: noon, June 22 2026.
const NOW = new Date(2026, 5, 22, 12, 0, 0);

describe('eventBadgeLabel', () => {
  it('returns "Today" for the current date', () => {
    expect(eventBadgeLabel('2026-06-22', NOW)).toBe('Today');
  });

  it('returns "Tomorrow" for the next day', () => {
    expect(eventBadgeLabel('2026-06-23', NOW)).toBe('Tomorrow');
  });

  it('returns a formatted "Mon D" label for dates further out', () => {
    expect(eventBadgeLabel('2026-06-30', NOW)).toBe('Jun 30');
  });

  it('returns null for past dates', () => {
    expect(eventBadgeLabel('2026-06-21', NOW)).toBeNull();
  });

  it('treats earlier today as Today, not past (ignores the time component)', () => {
    const lateToday = new Date(2026, 5, 22, 23, 30, 0);
    expect(eventBadgeLabel('2026-06-22', lateToday)).toBe('Today');
  });

  it('handles a month boundary for "Tomorrow"', () => {
    const endOfMonth = new Date(2026, 5, 30, 9, 0, 0);
    expect(eventBadgeLabel('2026-07-01', endOfMonth)).toBe('Tomorrow');
  });

  it('formats a date in a different month', () => {
    expect(eventBadgeLabel('2026-07-04', NOW)).toBe('Jul 4');
  });
});

describe('countdownLabel', () => {
  const start = new Date(2026, 5, 25, 18, 0, 0);
  const end   = new Date(2026, 5, 25, 20, 0, 0);

  it('returns null once the event has ended', () => {
    const after = new Date(2026, 5, 25, 20, 0, 1);
    expect(countdownLabel(start, end, after)).toBeNull();
  });

  it('returns "Happening Now" while the event is in progress', () => {
    const during = new Date(2026, 5, 25, 19, 0, 0);
    expect(countdownLabel(start, end, during)).toBe('Happening Now');
  });

  it('returns "Happening Now" exactly at the start instant', () => {
    expect(countdownLabel(start, end, new Date(start))).toBe('Happening Now');
  });

  it('shows days and hours when more than a day remains', () => {
    const now = new Date(2026, 5, 23, 12, 0, 0); // ~2d 6h before start
    expect(countdownLabel(start, end, now)).toBe('in 2d 6h');
  });

  it('shows hours and minutes when less than a day remains', () => {
    const now = new Date(2026, 5, 25, 14, 30, 0); // 3h 30m before
    expect(countdownLabel(start, end, now)).toBe('in 3h 30m');
  });

  it('shows only minutes when less than an hour remains', () => {
    const now = new Date(2026, 5, 25, 17, 45, 0); // 15m before
    expect(countdownLabel(start, end, now)).toBe('in 15m');
  });
});
