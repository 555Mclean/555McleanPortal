import { describe, it, expect } from 'vitest';
import { buildICS } from '../lib/ics.js';

// Fixed timestamp source so DTSTAMP is deterministic: 2026-06-22T15:04:05 UTC.
const NOW = new Date(Date.UTC(2026, 5, 22, 15, 4, 5));

const base = {
  dateStr: '2026-07-15',
  title: 'Monthly Board Meeting',
  location: 'Community Room, 555 McLean Ave',
  startTime: '18:30',
  endTime: '20:00',
  now: NOW,
};

describe('buildICS', () => {
  it('wraps the event in a VCALENDAR/VEVENT envelope', () => {
    const ics = buildICS(base);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('uses CRLF line endings as required by the iCalendar spec', () => {
    expect(buildICS(base)).toContain('\r\n');
  });

  it('formats DTSTART and DTEND from the date and times', () => {
    const ics = buildICS(base);
    expect(ics).toContain('DTSTART:20260715T183000');
    expect(ics).toContain('DTEND:20260715T200000');
  });

  it('formats DTSTAMP from the injected now in UTC', () => {
    expect(buildICS(base)).toContain('DTSTAMP:20260622T150405Z');
  });

  it('builds a UID from the date and start time', () => {
    expect(buildICS(base)).toContain('UID:2026-07-15T1830@555mclean.github.io');
  });

  it('includes the summary and location', () => {
    const ics = buildICS(base);
    expect(ics).toContain('SUMMARY:Monthly Board Meeting');
    expect(ics).toContain('LOCATION:Community Room\\, 555 McLean Ave');
  });

  it('escapes commas, semicolons, and backslashes in text fields', () => {
    const ics = buildICS({ ...base, title: 'A; B, C \\ D' });
    expect(ics).toContain('SUMMARY:A\\; B\\, C \\\\ D');
  });

  it('zero-pads single-digit UTC stamp components', () => {
    const ics = buildICS({ ...base, now: new Date(Date.UTC(2026, 0, 3, 4, 5, 6)) });
    expect(ics).toContain('DTSTAMP:20260103T040506Z');
  });
});
