import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  toggleNav, applyTheme, toggleTheme,
  applyUpdateFilters, filterUpdates, searchUpdates,
  refreshEventBadges, countdownLabel, startCountdown,
  buildICS, addToCalendar, dismissNotice, initNoticeExpiry,
  toggleFAQ, filterFAQ, showToast, copyAddress, initPage,
} from '../page.js';

// ─── mobile nav ──────────────────────────────────────────────────────────────

describe('toggleNav', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="nav-toggle" aria-expanded="false">☰</button>
      <nav id="main-nav"></nav>
    `;
  });

  it('opens the nav and updates the button state', () => {
    toggleNav();
    expect(document.getElementById('main-nav').classList.contains('open')).toBe(true);
    const btn = document.getElementById('nav-toggle');
    expect(btn.textContent).toBe('✕');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.getAttribute('aria-label')).toBe('Close menu');
  });

  it('closes the nav again on a second toggle', () => {
    toggleNav();
    toggleNav();
    expect(document.getElementById('main-nav').classList.contains('open')).toBe(false);
    const btn = document.getElementById('nav-toggle');
    expect(btn.textContent).toBe('☰');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});

// ─── theme ───────────────────────────────────────────────────────────────────

describe('theme', () => {
  beforeEach(() => {
    document.body.innerHTML = `<button id="theme-toggle"></button>`;
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('applyTheme(true) sets dark mode and the sun icon', () => {
    applyTheme(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.getElementById('theme-toggle').textContent).toBe('☀️');
  });

  it('applyTheme(false) sets light mode and the moon icon', () => {
    applyTheme(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.getElementById('theme-toggle').textContent).toBe('🌙');
  });

  it('toggleTheme switches to dark and persists the choice', () => {
    applyTheme(false);
    toggleTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('toggleTheme switches back to light and persists the choice', () => {
    applyTheme(true);
    toggleTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});

// ─── updates filter + search ─────────────────────────────────────────────────

describe('update filtering', () => {
  function allBtn() { return document.querySelector('[data-filter="all"]'); }

  beforeEach(() => {
    document.body.innerHTML = `
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="maintenance">Maintenance</button>
      <button class="filter-btn" data-filter="safety">Safety</button>
      <div class="update-card" data-category="maintenance">Elevator inspection</div>
      <div class="update-card" data-category="safety">Damaged tree near garage</div>
      <div class="update-card" data-category="general">Welcome to the portal</div>
      <div id="updates-no-results" style="display:none"></div>
    `;
    // reset module state from previous tests
    searchUpdates('');
    filterUpdates(allBtn());
  });

  function visibleCards() {
    return [...document.querySelectorAll('.update-card')].filter(c => c.style.display !== 'none');
  }

  it('shows all cards by default', () => {
    applyUpdateFilters();
    expect(visibleCards()).toHaveLength(3);
  });

  it('filters cards by category', () => {
    filterUpdates(document.querySelector('[data-filter="maintenance"]'));
    expect(visibleCards()).toHaveLength(1);
    expect(visibleCards()[0].textContent).toContain('Elevator');
  });

  it('moves the active class to the clicked filter button', () => {
    const btn = document.querySelector('[data-filter="safety"]');
    filterUpdates(btn);
    expect(btn.classList.contains('active')).toBe(true);
    expect(allBtn().classList.contains('active')).toBe(false);
  });

  it('filters cards by search text, case-insensitively', () => {
    searchUpdates('ELEVATOR');
    expect(visibleCards()).toHaveLength(1);
  });

  it('combines category filter and search query', () => {
    filterUpdates(document.querySelector('[data-filter="safety"]'));
    searchUpdates('elevator'); // elevator card is maintenance, not safety
    expect(visibleCards()).toHaveLength(0);
  });

  it('shows the no-results element when nothing matches', () => {
    searchUpdates('zzz-no-such-update');
    expect(document.getElementById('updates-no-results').style.display).toBe('block');
  });

  it('hides the no-results element again when matches return', () => {
    searchUpdates('zzz-no-such-update');
    searchUpdates('');
    expect(document.getElementById('updates-no-results').style.display).toBe('none');
    expect(visibleCards()).toHaveLength(3);
  });

  it('trims surrounding whitespace from the query', () => {
    searchUpdates('  tree  ');
    expect(visibleCards()).toHaveLength(1);
    expect(visibleCards()[0].textContent).toContain('tree');
  });
});

// ─── event badges ────────────────────────────────────────────────────────────

describe('refreshEventBadges', () => {
  const NOW = new Date(2026, 5, 11, 10, 0);

  it('rewrites badge text relative to today', () => {
    document.body.innerHTML = `
      <span class="badge" data-event-date="2026-06-11">stale</span>
      <span class="badge" data-event-date="2026-06-12">stale</span>
      <span class="badge" data-event-date="2026-06-20">stale</span>
    `;
    refreshEventBadges(NOW);
    const badges = document.querySelectorAll('.badge');
    expect(badges[0].textContent).toBe('Today');
    expect(badges[1].textContent).toBe('Tomorrow');
    expect(badges[2].textContent).toBe('Jun 20');
  });

  it('removes badges for past events', () => {
    document.body.innerHTML = `<span class="badge" data-event-date="2026-06-01">Today</span>`;
    refreshEventBadges(NOW);
    expect(document.querySelector('.badge')).toBeNull();
  });

  it('leaves static badges without data-event-date alone', () => {
    document.body.innerHTML = `<span class="badge">Action Required</span>`;
    refreshEventBadges(NOW);
    expect(document.querySelector('.badge').textContent).toBe('Action Required');
  });
});

// ─── countdown ───────────────────────────────────────────────────────────────

describe('countdownLabel', () => {
  const start = new Date('2026-07-15T19:00:00');
  const end   = new Date('2026-07-15T20:30:00');

  it('returns null after the meeting has ended', () => {
    expect(countdownLabel(start, end, new Date('2026-07-15T21:00:00'))).toBeNull();
  });

  it('returns "Happening Now" between start and end', () => {
    expect(countdownLabel(start, end, new Date('2026-07-15T19:30:00'))).toBe('Happening Now');
    expect(countdownLabel(start, end, start)).toBe('Happening Now');
  });

  it('shows days and hours when more than a day away', () => {
    expect(countdownLabel(start, end, new Date('2026-07-13T16:00:00'))).toBe('in 2d 3h');
  });

  it('shows hours and minutes when less than a day away', () => {
    expect(countdownLabel(start, end, new Date('2026-07-15T15:55:00'))).toBe('in 3h 5m');
  });

  it('shows only minutes in the final hour', () => {
    expect(countdownLabel(start, end, new Date('2026-07-15T18:48:00'))).toBe('in 12m');
  });
});

describe('startCountdown', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('does nothing when no chip exists', () => {
    document.body.innerHTML = '';
    expect(() => startCountdown()).not.toThrow();
  });

  it('removes the chip when its dates are invalid', () => {
    document.body.innerHTML = `<span id="meeting-countdown" data-start="garbage" data-end="garbage"></span>`;
    startCountdown();
    expect(document.getElementById('meeting-countdown')).toBeNull();
  });

  it('renders the countdown immediately and updates over time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T18:48:00'));
    document.body.innerHTML = `<span id="meeting-countdown" data-start="2026-07-15T19:00:00" data-end="2026-07-15T20:30:00"></span>`;
    startCountdown();
    expect(document.getElementById('meeting-countdown').textContent).toBe('in 12m');

    vi.advanceTimersByTime(15 * 60 * 1000); // 19:03 — meeting underway
    expect(document.getElementById('meeting-countdown').textContent).toBe('Happening Now');
  });

  it('removes the chip and stops ticking once the meeting ends', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T20:29:00'));
    document.body.innerHTML = `<span id="meeting-countdown" data-start="2026-07-15T19:00:00" data-end="2026-07-15T20:30:00"></span>`;
    startCountdown();
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(document.getElementById('meeting-countdown')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ─── .ics calendar export ────────────────────────────────────────────────────

describe('buildICS', () => {
  const NOW = new Date(Date.UTC(2026, 5, 11, 14, 30, 5));
  const ics = () => buildICS('2026-07-15', 'Board Meeting — 555 McLean Ave', 'Community Room', '19:00', '20:30', NOW);

  it('produces a VCALENDAR wrapping a single VEVENT, joined with CRLF', () => {
    const lines = ics().split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-1)).toBe('END:VCALENDAR');
    expect(lines).toContain('BEGIN:VEVENT');
    expect(lines).toContain('END:VEVENT');
  });

  it('formats DTSTART and DTEND from the date and times', () => {
    expect(ics()).toContain('DTSTART:20260715T190000');
    expect(ics()).toContain('DTEND:20260715T203000');
  });

  it('formats DTSTAMP as zero-padded UTC', () => {
    expect(ics()).toContain('DTSTAMP:20260611T143005Z');
  });

  it('builds a stable UID from date and start time', () => {
    expect(ics()).toContain('UID:2026-07-15T1900@555mclean.github.io');
  });

  it('escapes commas, semicolons, and backslashes in text fields', () => {
    const out = buildICS('2026-07-15', 'AGM; budget, vote\\recount', 'Room 1, Floor 2', '19:00', '20:00', NOW);
    expect(out).toContain('SUMMARY:AGM\\; budget\\, vote\\\\recount');
    expect(out).toContain('LOCATION:Room 1\\, Floor 2');
  });
});

describe('addToCalendar', () => {
  let clickSpy;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clickSpy.mockRestore();
    vi.useRealTimers();
  });

  it('does nothing when the date is missing (TBD meetings)', () => {
    addToCalendar('', 'X', 'Y', '19:00', '20:00');
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('creates a calendar blob, clicks a download link, and cleans up', () => {
    vi.useFakeTimers();
    addToCalendar('2026-07-15', 'Board Meeting', 'Community Room', '19:00', '20:30');
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/calendar;charset=utf-8');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(document.querySelector('a')).toBeNull(); // link removed after click
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});

// ─── notice bar ──────────────────────────────────────────────────────────────

describe('dismissNotice', () => {
  it('removes the notice bar', () => {
    document.body.innerHTML = `<div id="notice-bar"></div>`;
    dismissNotice();
    expect(document.getElementById('notice-bar')).toBeNull();
  });

  it('is a no-op when there is no notice bar', () => {
    document.body.innerHTML = '';
    expect(() => dismissNotice()).not.toThrow();
  });
});

describe('initNoticeExpiry', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('removes the bar immediately when already expired', () => {
    document.body.innerHTML = `<div id="notice-bar" data-expires="2026-06-10T14:00"></div>`;
    initNoticeExpiry(new Date(2026, 5, 11));
    expect(document.getElementById('notice-bar')).toBeNull();
  });

  it('schedules removal when expiry is within 24 hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 11, 10, 0));
    document.body.innerHTML = `<div id="notice-bar" data-expires="2026-06-11T14:00"></div>`;
    initNoticeExpiry(new Date(2026, 5, 11, 10, 0));
    expect(document.getElementById('notice-bar')).not.toBeNull();
    vi.advanceTimersByTime(4 * 3600 * 1000);
    expect(document.getElementById('notice-bar')).toBeNull();
  });

  it('leaves the bar alone when expiry is more than a day away', () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<div id="notice-bar" data-expires="2026-06-20T14:00"></div>`;
    initNoticeExpiry(new Date(2026, 5, 11, 10, 0));
    expect(vi.getTimerCount()).toBe(0);
    expect(document.getElementById('notice-bar')).not.toBeNull();
  });

  it('ignores bars without an expiry or with an invalid one', () => {
    document.body.innerHTML = `<div id="notice-bar"></div>`;
    initNoticeExpiry();
    expect(document.getElementById('notice-bar')).not.toBeNull();

    document.body.innerHTML = `<div id="notice-bar" data-expires="not-a-date"></div>`;
    initNoticeExpiry();
    expect(document.getElementById('notice-bar')).not.toBeNull();
  });
});

// ─── FAQ ─────────────────────────────────────────────────────────────────────

describe('FAQ accordion and search', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="faq-item"><button class="faq-question" aria-expanded="false">How do I pay maintenance fees?</button></div>
      <div class="faq-item"><button class="faq-question" aria-expanded="false">Where do I park?</button></div>
      <div id="faq-no-results" style="display:none"></div>
    `;
  });

  function items() { return document.querySelectorAll('.faq-item'); }
  function questions() { return document.querySelectorAll('.faq-question'); }

  it('toggleFAQ opens the clicked item', () => {
    toggleFAQ(questions()[0]);
    expect(items()[0].classList.contains('open')).toBe(true);
    expect(questions()[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('toggleFAQ closes other open items', () => {
    toggleFAQ(questions()[0]);
    toggleFAQ(questions()[1]);
    expect(items()[0].classList.contains('open')).toBe(false);
    expect(items()[1].classList.contains('open')).toBe(true);
  });

  it('toggleFAQ closes an already-open item', () => {
    toggleFAQ(questions()[0]);
    toggleFAQ(questions()[0]);
    expect(items()[0].classList.contains('open')).toBe(false);
    expect(questions()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('filterFAQ hides items whose question does not match', () => {
    filterFAQ('park');
    expect(items()[0].style.display).toBe('none');
    expect(items()[1].style.display).toBe('');
  });

  it('filterFAQ shows the no-results element when nothing matches', () => {
    filterFAQ('elevator');
    expect(document.getElementById('faq-no-results').style.display).toBe('block');
  });

  it('filterFAQ restores all items when the query is cleared', () => {
    filterFAQ('park');
    filterFAQ('');
    expect(items()[0].style.display).toBe('');
    expect(items()[1].style.display).toBe('');
    expect(document.getElementById('faq-no-results').style.display).toBe('none');
  });
});

// ─── toast ───────────────────────────────────────────────────────────────────

describe('showToast', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="toast"></div>`;
    vi.useFakeTimers();
  });

  afterEach(() => { vi.useRealTimers(); });

  it('shows the message', () => {
    showToast('Saved!');
    const toast = document.getElementById('toast');
    expect(toast.textContent).toBe('Saved!');
    expect(toast.classList.contains('show')).toBe(true);
  });

  it('hides the toast after a delay', () => {
    showToast('Saved!');
    vi.advanceTimersByTime(3200);
    expect(document.getElementById('toast').classList.contains('show')).toBe(false);
  });

  it('restarts the timer when a second toast arrives', () => {
    showToast('First');
    vi.advanceTimersByTime(2000);
    showToast('Second');
    vi.advanceTimersByTime(2000); // 4s after first, 2s after second
    expect(document.getElementById('toast').classList.contains('show')).toBe(true);
    expect(document.getElementById('toast').textContent).toBe('Second');
  });
});

// ─── copy address ────────────────────────────────────────────────────────────

describe('copyAddress', () => {
  let btn;

  beforeEach(() => {
    document.body.innerHTML = `<button id="copy-btn">📋</button><div id="toast"></div>`;
    btn = document.getElementById('copy-btn');
  });

  afterEach(() => {
    delete navigator.clipboard;
    vi.useRealTimers();
  });

  it('falls back to a hint toast when the Clipboard API is unavailable', () => {
    copyAddress(btn);
    expect(document.getElementById('toast').textContent).toBe('Use Ctrl+C to copy');
    expect(btn.textContent).toBe('📋');
  });

  it('copies the address and confirms with a checkmark and toast', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    copyAddress(btn);
    await vi.waitFor(() => expect(btn.textContent).toBe('✓'));
    expect(writeText).toHaveBeenCalledWith('555 McLean Ave, Yonkers, NY 10705');
    expect(document.getElementById('toast').textContent).toBe('Address copied to clipboard');
  });

  it('restores the button label after the confirmation', async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue() }, configurable: true,
    });

    copyAddress(btn);
    await vi.advanceTimersByTimeAsync(0); // let the promise resolve
    expect(btn.textContent).toBe('✓');
    await vi.advanceTimersByTimeAsync(2000);
    expect(btn.textContent).toBe('📋');
  });

  it('shows an error toast when the copy fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true,
    });

    copyAddress(btn);
    await vi.waitFor(() =>
      expect(document.getElementById('toast').textContent).toBe('Could not copy — try selecting the text manually'));
    expect(btn.textContent).toBe('📋');
  });
});

// ─── initPage ────────────────────────────────────────────────────────────────

describe('initPage', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="progress-bar"></div>
      <button id="theme-toggle"></button>
      <button id="nav-toggle" aria-expanded="false">☰</button>
      <nav id="main-nav"><a href="#about">About</a></nav>
      <section id="about"></section>
      <div id="parking-slots"></div><div id="parking-footer"></div>
      <div id="storage-slots"></div><div id="storage-footer"></div>
      <button id="back-to-top"></button>
      <div id="toast"></div>
    `;
    localStorage.clear();
    global.IntersectionObserver = vi.fn(function () {
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  it('exposes the inline-handler API on window', () => {
    initPage();
    for (const name of [
      'switchWLTab', 'submitWaitlist', 'submitNewsletter', 'openMaintWizard',
      'closeMaintWizard', 'selectMaintCategory', 'maintNext', 'maintBack',
      'submitMaintenance', 'toggleNav', 'toggleTheme', 'filterUpdates',
      'searchUpdates', 'addToCalendar', 'dismissNotice', 'toggleFAQ',
      'filterFAQ', 'showToast', 'copyAddress',
    ]) {
      expect(window[name], `window.${name}`).toBeTypeOf('function');
    }
  });

  it('renders the waitlist slots on startup', () => {
    initPage();
    expect(document.querySelector('#parking-slots .wl-slot')).not.toBeNull();
    expect(document.querySelector('#storage-slots .wl-slot')).not.toBeNull();
  });

  it('applies the OS color scheme when no theme is saved', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    initPage();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('prefers the saved theme over the OS preference', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    localStorage.setItem('theme', 'light');
    initPage();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('closes the mobile nav on Escape', () => {
    initPage();
    toggleNav();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('main-nav').classList.contains('open')).toBe(false);
  });

  it('Escape closes an open maintenance wizard before touching the nav', () => {
    document.body.innerHTML += `<div id="mr-overlay" class="open"></div>`;
    initPage();
    toggleNav();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('mr-overlay').classList.contains('open')).toBe(false);
    expect(document.getElementById('main-nav').classList.contains('open')).toBe(true);
  });

  it('closes the mobile nav when a nav link is clicked', () => {
    initPage();
    toggleNav();
    document.querySelector('#main-nav a').dispatchEvent(new MouseEvent('click'));
    expect(document.getElementById('main-nav').classList.contains('open')).toBe(false);
  });

  it('updates the scroll progress bar on scroll', () => {
    initPage();
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000 + window.innerHeight, configurable: true,
    });
    window.dispatchEvent(new Event('scroll'));
    expect(document.getElementById('progress-bar').style.width).toBe('25%');
  });

  it('shows the back-to-top button only after scrolling down', () => {
    initPage();
    const btn = document.getElementById('back-to-top');
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(btn.classList.contains('visible')).toBe(true);
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(btn.classList.contains('visible')).toBe(false);
  });

  it('highlights the nav link for the section in view', () => {
    const callbacks = [];
    global.IntersectionObserver = vi.fn(function (cb) {
      callbacks.push(cb);
      return { observe: vi.fn(), unobserve: vi.fn() };
    });
    initPage();
    // observers are created in order: fade-in (init), nav highlight
    const navCb = callbacks[1];
    navCb([{ isIntersecting: true, target: document.getElementById('about') }]);
    expect(document.querySelector('#main-nav a').classList.contains('active')).toBe(true);
    navCb([{ isIntersecting: false, target: document.getElementById('about') }]);
    expect(document.querySelector('#main-nav a').classList.contains('active')).toBe(true); // unchanged
  });

  it('animates waitlist slot positions counting up when scrolled into view', () => {
    vi.useFakeTimers();
    try {
      document.body.innerHTML += `
        <div id="wl-counts-display">
          <div class="wl-slot"><span class="wl-slot-pos">#3</span></div>
        </div>`;
      const callbacks = [];
      global.IntersectionObserver = vi.fn(function (cb) {
        callbacks.push(cb);
        return { observe: vi.fn(), unobserve: vi.fn() };
      });
      initPage();
      // observers: fade-in (init), nav highlight, waitlist stagger
      const wlCb = callbacks[2];
      const target = document.getElementById('wl-counts-display');
      wlCb([{ isIntersecting: false, target }]); // ignored
      wlCb([{ isIntersecting: true, target }]);

      const pos = target.querySelector('.wl-slot-pos');
      vi.advanceTimersByTime(80); // first slot's stagger delay
      expect(pos.textContent).toBe('#1');
      vi.advanceTimersByTime(55 * 2); // count-up ticks
      expect(pos.textContent).toBe('#3');
      vi.advanceTimersByTime(5000);
      expect(pos.textContent).toBe('#3'); // stops at the slot's real position
    } finally {
      vi.useRealTimers();
    }
  });
});
