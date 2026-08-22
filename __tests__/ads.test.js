import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adsState, adUnits, inject } from '../build-lib.js';
import { unitStatus, fillVerdict, initAds, AD_FILL_TIMEOUT, PENDING_CLASS } from '../ads.js';

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
    expect(s.sectionHTML).toContain('<section id="sponsors" class="ads-pending">');
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
  const units = () => document.querySelectorAll('ins.adsbygoogle');

  it('does nothing when ads are off and the section was never built', () => {
    document.body.innerHTML = '';
    expect(initAds()).toBe(false);
  });

  it('queues one AdSense request per unit', () => {
    expect(initAds()).toBe(true);
    expect(window.adsbygoogle.length).toBe(1);
  });

  // Regression: the section must NOT be display:none while AdSense measures the
  // slot. AdSense refuses to fill a zero-width slot, so hiding it outright meant
  // no fill, and "reveal only on fill" could then never fire.
  it('leaves the slot laid out (pending, not hidden) while AdSense decides', () => {
    initAds();
    expect(section().hidden).toBe(false);
    expect(section().classList.contains(PENDING_CLASS)).toBe(true);
    expect(units().length).toBe(1);
    expect(nav().hidden).toBe(true);
  });

  it('reveals the section and the nav link once an ad fills', async () => {
    initAds();
    units()[0].setAttribute('data-ad-status', 'filled');
    await vi.advanceTimersByTimeAsync(1);
    expect(section().classList.contains(PENDING_CLASS)).toBe(false);
    expect(section().hidden).toBe(false);
    expect(nav().hidden).toBe(false);
  });

  it('removes the section when the ad goes unfilled', async () => {
    initAds();
    units()[0].setAttribute('data-ad-status', 'unfilled');
    await vi.advanceTimersByTimeAsync(1);
    expect(section().hidden).toBe(true);
    expect(nav().hidden).toBe(true);
  });

  it('gives up when AdSense never answers (blocked script)', async () => {
    initAds();
    await vi.advanceTimersByTimeAsync(AD_FILL_TIMEOUT);
    expect(section().hidden).toBe(true);
    expect(nav().hidden).toBe(true);
  });

  // An <ins> left inside a hidden container can still fill later, burning an
  // impression no resident ever saw, so giving up must remove the units.
  it('removes the ad units when it gives up, so no unseen impression can load', async () => {
    initAds();
    await vi.advanceTimersByTimeAsync(AD_FILL_TIMEOUT);
    expect(units().length).toBe(0);
  });

  it('waits for a slow fill instead of giving up early', async () => {
    initAds();
    await vi.advanceTimersByTimeAsync(AD_FILL_TIMEOUT - 1000);
    expect(section().hidden).toBe(false); // still pending, still fillable
    units()[0].setAttribute('data-ad-status', 'filled');
    await vi.advanceTimersByTimeAsync(1);
    expect(section().classList.contains(PENDING_CLASS)).toBe(false);
  });

  it('reveals on a fill even when one of several units comes back unfilled', async () => {
    document.body.innerHTML = adsState({
      ...VALID,
      units: [{ id: 'a', slot: '1111111111' }, { id: 'b', slot: '2222222222' }],
    }).sectionHTML + '<a href="#sponsors" id="sponsors-nav" hidden>Sponsors</a>';
    initAds();
    const [first, second] = units();
    first.setAttribute('data-ad-status', 'unfilled');
    await vi.advanceTimersByTimeAsync(1);
    expect(section().hidden).toBe(false); // undecided — one unit still pending
    second.setAttribute('data-ad-status', 'filled');
    await vi.advanceTimersByTimeAsync(1);
    expect(section().classList.contains(PENDING_CLASS)).toBe(false);
  });

  it('operates on the document it was handed, not the global one', async () => {
    const other = document.implementation.createHTMLDocument('other');
    other.body.innerHTML = adsState(VALID).sectionHTML +
      '<a href="#sponsors" id="sponsors-nav" hidden>Sponsors</a>';
    initAds(other);
    other.querySelector('ins.adsbygoogle').setAttribute('data-ad-status', 'filled');
    await vi.advanceTimersByTimeAsync(1);
    expect(other.getElementById('sponsors-nav').hidden).toBe(false);
    // the global document's section was never touched
    expect(section().classList.contains(PENDING_CLASS)).toBe(true);
  });
});

// ── Marker injection ──────────────────────────────────────────────────────────
// Board-authored copy reaches build.js as a String.replace replacement, where
// "$" sequences are patterns: "$&" re-inserts the marker and "$'" splices in the
// entire rest of the file.

describe('inject', () => {
  const page = '<p><!-- MARK --></p>TAIL';

  it('inserts a dollar amount verbatim', () => {
    expect(inject(page, /<!-- MARK -->/, 'Assessment: $250')).toBe('<p>Assessment: $250</p>TAIL');
  });

  it("does not let $&, $' or $$ rewrite the page", () => {
    expect(inject(page, /<!-- MARK -->/, "a$&b")).toBe('<p>a$&b</p>TAIL');
    expect(inject(page, /<!-- MARK -->/, "a$'b")).toBe("<p>a$'b</p>TAIL");
    expect(inject(page, /<!-- MARK -->/, 'a$$b')).toBe('<p>a$$b</p>TAIL');
  });
});
