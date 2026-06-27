import { describe, it, expect } from 'vitest';
import { parseCSVRows, parseCSV, rowsToWaitlist, csvToWaitlist } from '../scripts/sync-lib.mjs';

// ─── parseCSVRows ──────────────────────────────────────────────────────────────

describe('parseCSVRows', () => {
  it('splits simple rows and cells', () => {
    expect(parseCSVRows('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('keeps commas inside quoted fields', () => {
    expect(parseCSVRows('a,"b,c",d')).toEqual([['a', 'b,c', 'd']]);
  });

  it('handles escaped quotes ("")', () => {
    expect(parseCSVRows('"she said ""hi""",x')).toEqual([['she said "hi"', 'x']]);
  });

  it('handles newlines inside quoted fields', () => {
    expect(parseCSVRows('"line1\nline2",b')).toEqual([['line1\nline2', 'b']]);
  });

  it('normalises CRLF line endings', () => {
    expect(parseCSVRows('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

// ─── parseCSV ──────────────────────────────────────────────────────────────────

describe('parseCSV', () => {
  it('keys cells by trimmed header', () => {
    const rows = parseCSV('Timestamp, Apartment ,List\n2026,4B,Parking');
    expect(rows).toEqual([{ Timestamp: '2026', Apartment: '4B', List: 'Parking' }]);
  });

  it('returns an empty array when there are no data rows', () => {
    expect(parseCSV('Apartment,List')).toEqual([]);
  });

  it('skips fully blank rows', () => {
    const rows = parseCSV('Apartment,List\n4B,Parking\n\n,\n2C,Storage');
    expect(rows).toHaveLength(2);
  });
});

// ─── rowsToWaitlist ─────────────────────────────────────────────────────────────

describe('rowsToWaitlist', () => {
  const rows = [
    { Timestamp: '1', Apartment: '4B', List: 'Parking' },
    { Timestamp: '2', Apartment: '2C', List: 'Storage Unit' },
    { Timestamp: '3', Apartment: '7A', List: 'Parking Spot' },
  ];

  it('routes apartments into parking and storage in submission order', () => {
    expect(rowsToWaitlist(rows)).toEqual({ parking: ['4B', '7A'], storage: ['2C'] });
  });

  it('de-duplicates an apartment within a list (first occurrence wins)', () => {
    const dup = [...rows, { Timestamp: '4', Apartment: '4b', List: 'Parking' }];
    expect(rowsToWaitlist(dup).parking).toEqual(['4B', '7A']);
  });

  it('allows the same apartment on both lists', () => {
    const both = [
      { Apartment: '5D', List: 'Parking' },
      { Apartment: '5D', List: 'Storage' },
    ];
    expect(rowsToWaitlist(both)).toEqual({ parking: ['5D'], storage: ['5D'] });
  });

  it('drops rows flagged as assigned/removed', () => {
    const withStatus = [
      { Apartment: '4B', List: 'Parking', Status: '' },
      { Apartment: '7A', List: 'Parking', Status: 'assigned' },
      { Apartment: '9C', List: 'Parking', Status: 'yes' },
    ];
    expect(rowsToWaitlist(withStatus).parking).toEqual(['4B']);
  });

  it('ignores rows with no apartment', () => {
    const sparse = [{ Apartment: '', List: 'Parking' }, { Apartment: '  ', List: 'Storage' }];
    expect(rowsToWaitlist(sparse)).toEqual({ parking: [], storage: [] });
  });

  it('ignores rows whose list value is unrecognised', () => {
    const odd = [{ Apartment: '4B', List: 'Bicycle' }];
    expect(rowsToWaitlist(odd)).toEqual({ parking: [], storage: [] });
  });

  it('returns empty lists when no apartment column can be found', () => {
    const noApt = [{ Foo: 'x', List: 'Parking' }];
    expect(rowsToWaitlist(noApt)).toEqual({ parking: [], storage: [] });
  });

  it('detects alternate column names (Unit / Queue)', () => {
    const alt = [{ Unit: '4B', Queue: 'parking' }];
    expect(rowsToWaitlist(alt)).toEqual({ parking: ['4B'], storage: [] });
  });

  it('honours explicit column overrides', () => {
    const custom = [{ home: '4B', kind: 'storage' }];
    expect(rowsToWaitlist(custom, { aptKey: 'home', listKey: 'kind' }))
      .toEqual({ parking: [], storage: ['4B'] });
  });

  it('defaults to parking when there is no list column', () => {
    const noList = [{ Apartment: '4B' }, { Apartment: '5C' }];
    expect(rowsToWaitlist(noList)).toEqual({ parking: ['4B', '5C'], storage: [] });
  });
});

// ─── csvToWaitlist ──────────────────────────────────────────────────────────────

describe('csvToWaitlist', () => {
  it('parses a realistic Google Forms responses CSV', () => {
    const csv = [
      'Timestamp,Full Name,Apartment #,Which list?,Email,Spot assigned?',
      '2026/06/01 9:00,Jane Smith,4B,Parking Spot,jane@x.com,',
      '2026/06/02 10:00,Bob Lee,2C,Storage Unit,bob@x.com,',
      '2026/06/03 11:00,Old Tenant,9Z,Parking Spot,old@x.com,assigned',
    ].join('\n');
    expect(csvToWaitlist(csv)).toEqual({ parking: ['4B'], storage: ['2C'] });
  });

  it('produces output matching the data/waitlist.json contract (unique strings)', () => {
    const csv = 'Apartment,List\n4B,Parking\n4B,Parking\n2C,Storage';
    const wl = csvToWaitlist(csv);
    for (const key of ['parking', 'storage']) {
      expect(Array.isArray(wl[key])).toBe(true);
      for (const e of wl[key]) expect(typeof e).toBe('string');
      expect(new Set(wl[key]).size).toBe(wl[key].length);
    }
  });
});
