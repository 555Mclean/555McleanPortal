import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adsState, adUnits } from '../build-lib.js';
import { unitStatus, fillVerdict, initAds, AD_FILL_TIMEOUT } from '../ads.js';

const VALID = {
  enabled: true,
  client: 'ca-pub-1234567890123456',
  heading: 'Local Sponsors',
  units: [{ id: 'sponsors-main', slot: '9876543210', format: 'auto', responsive: true }],
};

// ── Build-time gating ─────────────────────────────────────────────────────────
// A half-configured ads.json must render nothing: an AdSense tag with a
// placeholder publisher id errors on every visitor's page load.

describe('adsState gating', () => {
  it('renders the section when fully configured', () => {
    const s = adsState(VALID);
    expect(s.enabled).toBe(true);
    expect(s.headHTML).toContain('adsbygoogle.js?client=ca-pub-1234567890123456');
    expect(s.sectionHTML).toContain('<section id="sponsors" hidden>');
    expect(s.navHTML).toContain('href="#sponsors"');
  });

  it('renders nothing when the board has not switched ads on', () => {
    const s = adsState({ ...VALID, enabled: false });
    expect(s.enabled).toBe(false);
    expect(s.headHTML).toBe('');
    expect(s.navHTML).toBe('');
    expect(s.sectionHTML).toBe('');
  });

  it('renders nothing without a real publisher id', () => {
    for (const client of ['', 'ca-pub-XXXXXXXXXXXXXXXX', 'pub-1234567890123456', 'ca-pub-123']) {
      expect(adsState({ ...VALID, client }).enabled).toBe(false);
    }
  });

  it('renders nothing when no unit has a real slot id', () => {
    expect(adsState({ ...VALID, units: [] }).enabled).toBe(false);
    expect(adsState({ ...VALID, units: [{ slot: '' }] }).enabled).toBe(false);
    expect(adsState({ ...VALID, units: [{ slot: 'REPLACE_ME' }] }).enabled).toBe(false);
  });

  it('treats a missing config as off rather than throwing', () => {
    expect(adsState().enabled).toBe(false);
    expect(adsState({}).enabled).toBe(false);
  });

  it('drops unconfigured units but keeps the configured ones', () => {
    const units = adUnits({ units: [{ slot: '1111111111' }, { slot: '' }, { slot: '2222222222' }] });
    expect(units.map(u => u.slot)).toEqual(['1111111111', '2222222222']);
  });

  it('escapes board-supplied copy', () => {
    const s = adsState({ ...VALID, heading: 'Sponsors <script>alert(1)</script>' });
    expect(s.sectionHTML).not.toContain('<script>alert(1)</script>');
    expect(s.sectionHTML).toContain('&lt;script&gt;');
  });

  it('honours responsive: false', () => {
    const s = adsState({ ...VALID, units: [{ slot: '9876543210', responsive: false }] });
    expect(s.sectionHTML).toContain('data-full-width-responsive="false"');
  });
});

// ── Runtime reveal ────────────────────────────────────────────────────────────

describe('fillVerdict', () => {
  const ins = status => {
    const el = document.createElement('ins');
    if (status) el.setAttribute('data-ad-status', status);
    return el;
  };

  it('reads a single unit', () => {
    expect(unitStatus(ins('filled'))).toBe(true);
    expect(unitStatus(ins('unfilled'))).toBe(false);
    expect(unitStatus(ins())).toBe(null);
  });

  it('is undecided while any unit is still pending', () => {
    expect(fillVerdict([ins('unfilled'), ins()])).toBe(null);
  });

  it('is true as soon as one unit fills', () => {
    expect(fillVerdict([ins('unfilled'), ins('filled')])).toBe(true);
  });

  it('is false only when every unit came back unfilled', () => {
    expect(fillVerdict([ins('unfilled'), ins('unfilled')])).toBe(false);
  });
});

describe('initAds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.adsbygoogle = undefined;
    document.body.innerHTML = adsState(VALID).sectionHTML +
      '<a href="#sponsors" id="sponsors-nav" hidden>Sponsors</a>';
  });

  const section = () => document.getElementById('sponsors');
  const nav = () => document.getElementById('sponsors-nav');

  it('does nothing when ads are off and the section was never built', () => {
    document.body.innerHTML = '';
    expect(initAds()).toBe(false);
  });

  it('queues one AdSense request per unit', () => {
    expect(initAds()).toBe(true);
    expect(window.adsbygoogle.length).toBe(1);
  });

  it('keeps the section hidden until a unit reports filled', () => {
    initAds();
    expect(section().hidden).toBe(true);
    expect(nav().hidden).toBe(true);
  });

  it('reveals the section and the nav link once an ad fills', async () => {
    initAds();
    document.querySelector('ins.adsbygoogle').setAttribute('data-ad-status', 'filled');
    await vi.advanceTimersByTimeAsync(AD_FILL_TIMEOUT);
    expect(section().hidden).toBe(false);
    expect(nav().hidden).toBe(false);
  });

  it('leaves the section hidden when the ad goes unfilled', async () => {
    initAds();
    document.querySelector('ins.adsbygoogle').setAttribute('data-ad-status', 'unfilled');
    await vi.advanceTimersByTimeAsync(AD_FILL_TIMEOUT);
    expect(section().hidden).toBe(true);
    expect(nav().hidden).toBe(true);
  });

  it('leaves the section hidden when AdSense never answers (blocked script)', async () => {
    initAds();
    await vi.advanceTimersByTimeAsync(AD_FILL_TIMEOUT);
    expect(section().hidden).toBe(true);
  });
});
