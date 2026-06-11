// Page behaviors for index.html — extracted from the former inline <script>
// so they can be unit-tested. index.html just imports initPage() and calls it.
import {
  init, switchWLTab, submitWaitlist, submitNewsletter, relativeDayLabel,
  openMaintWizard, closeMaintWizard, selectMaintCategory,
  maintNext, maintBack, submitMaintenance,
} from './main.js';

// Mobile hamburger
export function toggleNav() {
  const nav = document.getElementById('main-nav');
  const btn = document.getElementById('nav-toggle');
  const open = nav.classList.toggle('open');
  btn.textContent = open ? '✕' : '☰';
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  btn.setAttribute('aria-expanded', String(open));
}

function closeNav() {
  const nav = document.getElementById('main-nav');
  const btn = document.getElementById('nav-toggle');
  nav.classList.remove('open');
  btn.textContent = '☰';
  btn.setAttribute('aria-label', 'Open menu');
  btn.setAttribute('aria-expanded', 'false');
}

// Dark mode — respects OS preference on first visit, persists manual choice
export function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const themeBtn = document.getElementById('theme-toggle');
  themeBtn.textContent = dark ? '☀️' : '🌙';
  themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}

export function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
  applyTheme(dark);
}

// Update category filter + text search (combined)
let updCategory = 'all';
let updQuery = '';

export function applyUpdateFilters() {
  let any = false;
  document.querySelectorAll('.update-card').forEach(card => {
    const matchesCat   = updCategory === 'all' || card.dataset.category === updCategory;
    const matchesQuery = !updQuery || card.textContent.toLowerCase().includes(updQuery);
    const show = matchesCat && matchesQuery;
    card.style.display = show ? '' : 'none';
    if (show) any = true;
  });
  const noRes = document.getElementById('updates-no-results');
  if (noRes) noRes.style.display = any ? 'none' : 'block';
}

export function filterUpdates(btn) {
  updCategory = btn.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyUpdateFilters();
}

export function searchUpdates(val) {
  updQuery = val.toLowerCase().trim();
  applyUpdateFilters();
}

// Relative event badges (Today / Tomorrow / date) — recomputed on load so
// they stay accurate even when the site hasn't been rebuilt
export function refreshEventBadges(now = new Date()) {
  document.querySelectorAll('.badge[data-event-date]').forEach(b => {
    const label = relativeDayLabel(b.dataset.eventDate, now);
    if (label === null) b.remove();
    else b.textContent = label;
  });
}

// Next-meeting countdown chip (populated by build.js when a dated meeting exists)
// Returns null once the meeting has ended (chip should be removed).
export function countdownLabel(start, end, now = new Date()) {
  if (now > end) return null;
  if (now >= start) return 'Happening Now';
  const diff = start - now;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return 'in ' + (d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`);
}

export function startCountdown() {
  const chip = document.getElementById('meeting-countdown');
  if (!chip) return;
  const start = new Date(chip.dataset.start);
  const end   = new Date(chip.dataset.end);
  if (isNaN(start) || isNaN(end)) { chip.remove(); return; }
  let timer;
  function tick() {
    const label = countdownLabel(start, end);
    if (label === null) { chip.remove(); clearInterval(timer); return; }
    chip.textContent = label;
  }
  tick();
  timer = setInterval(tick, 30000);
}

// Add to Calendar (.ics download)
export function buildICS(dateStr, title, location, startTime, endTime, now = new Date()) {
  const esc = s => s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const [y, m, d] = dateStr.split('-');
  const start = `${y}${m}${d}T${startTime.replace(':', '')}00`;
  const end   = `${y}${m}${d}T${endTime.replace(':', '')}00`;
  const pad2  = n => String(n).padStart(2, '0');
  const dtstamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth()+1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
  const uid = `${dateStr}T${startTime.replace(':','')}@555mclean.github.io`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//555 McLean Ave//Resident Portal//EN',
    'BEGIN:VEVENT',
    'DTSTAMP:' + dtstamp,
    'UID:' + uid,
    'DTSTART:' + start,
    'DTEND:'   + end,
    'SUMMARY:' + esc(title),
    'LOCATION:' + esc(location),
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function addToCalendar(dateStr, title, location, startTime, endTime) {
  if (!dateStr) return;
  const ics  = buildICS(dateStr, title, location, startTime, endTime);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'meeting.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Notice bar dismiss
export function dismissNotice() {
  const bar = document.getElementById('notice-bar');
  if (bar) bar.remove();
}

// Auto-hide expired notice bar ("expires" field in data/notices.json)
export function initNoticeExpiry(now = new Date()) {
  const bar = document.getElementById('notice-bar');
  if (!bar || !bar.dataset.expires) return;
  const expiry = new Date(bar.dataset.expires);
  if (isNaN(expiry)) return;
  const remove = () => bar.remove();
  const remaining = expiry - now;
  if (remaining <= 0) remove();
  else if (remaining < 86400000) setTimeout(remove, remaining);
}

// FAQ accordion
export function toggleFAQ(btn) {
  const item = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => {
    i.classList.remove('open');
    i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
  });
  if (!isOpen) {
    item.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

// FAQ search filter
export function filterFAQ(val) {
  const q = val.toLowerCase().trim();
  let any = false;
  document.querySelectorAll('.faq-item').forEach(item => {
    const match = !q || item.querySelector('.faq-question').textContent.toLowerCase().includes(q);
    item.style.display = match ? '' : 'none';
    if (match) any = true;
  });
  document.getElementById('faq-no-results').style.display = any || !q ? 'none' : 'block';
}

// Toast notification
let toastTimer;
export function showToast(msg) {
  const toastEl = document.getElementById('toast');
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

// Copy address
export function copyAddress(btn) {
  if (!navigator.clipboard) { showToast('Use Ctrl+C to copy'); return; }
  navigator.clipboard.writeText('555 McLean Ave, Yonkers, NY 10705').then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓';
    showToast('Address copied to clipboard');
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }).catch(() => showToast('Could not copy — try selecting the text manually'));
}

let escHandler;

export function initPage() {
  window.switchWLTab = switchWLTab;
  window.submitWaitlist = submitWaitlist;
  window.submitNewsletter = submitNewsletter;
  window.openMaintWizard = openMaintWizard;
  window.closeMaintWizard = closeMaintWizard;
  window.selectMaintCategory = selectMaintCategory;
  window.maintNext = maintNext;
  window.maintBack = maintBack;
  window.submitMaintenance = submitMaintenance;
  window.toggleNav = toggleNav;
  window.toggleTheme = toggleTheme;
  window.filterUpdates = filterUpdates;
  window.searchUpdates = searchUpdates;
  window.addToCalendar = addToCalendar;
  window.dismissNotice = dismissNotice;
  window.toggleFAQ = toggleFAQ;
  window.filterFAQ = filterFAQ;
  window.showToast = showToast;
  window.copyAddress = copyAddress;

  init();
  updCategory = 'all';
  updQuery = '';

  // Scroll progress bar
  const bar = document.getElementById('progress-bar');
  window.addEventListener('scroll', () => {
    const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    bar.style.width = (window.scrollY / total * 100) + '%';
  }, { passive: true });

  // Active nav highlight
  const sections = document.querySelectorAll('#about, #updates, #meetings, #resources, #documents, #waitlist, #contact, #newsletter, #faq');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { threshold: 0.35 });
  sections.forEach(s => navObserver.observe(s));

  // Escape closes the maintenance wizard or the mobile nav (keyboard users)
  if (escHandler) document.removeEventListener('keydown', escHandler);
  escHandler = e => {
    if (e.key !== 'Escape') return;
    const mrOverlay = document.getElementById('mr-overlay');
    if (mrOverlay && mrOverlay.classList.contains('open')) { closeMaintWizard(); return; }
    const nav = document.getElementById('main-nav');
    if (!nav.classList.contains('open')) return;
    closeNav();
    document.getElementById('nav-toggle').focus();
  };
  document.addEventListener('keydown', escHandler);

  // Close nav on link click (mobile)
  document.querySelectorAll('#main-nav a').forEach(a => {
    a.addEventListener('click', closeNav);
  });

  // Dark mode initial state
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('theme'); } catch {}
  applyTheme(savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);

  refreshEventBadges();
  startCountdown();
  initNoticeExpiry();

  // Back to top
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      backToTopBtn.classList.toggle('visible', window.scrollY > 450);
    }, { passive: true });
  }

  // Waitlist slot stagger animation
  const wlDisplay = document.getElementById('wl-counts-display');
  if (wlDisplay) {
    const wlObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('.wl-slot').forEach((slot, i) => {
          slot.style.opacity = '0';
          slot.style.transform = 'translateX(-12px)';
          setTimeout(() => {
            slot.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            slot.style.opacity = '';
            slot.style.transform = '';
            const posEl = slot.querySelector('.wl-slot-pos');
            if (posEl) {
              const target = parseInt(posEl.textContent.replace('#', ''));
              let cur = 0;
              const step = () => { cur++; posEl.textContent = '#' + cur; if (cur < target) setTimeout(step, 55); };
              step();
            }
          }, i * 90 + 80);
        });
        wlObserver.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    wlObserver.observe(wlDisplay);
  }
}
