export const WL_DATA = {
  parking: ['P55501', 'P55502', 'P55503'],
  storage: ['S55501', 'S55502', 'S55503', 'S55504', 'S55505'],
};

// The position a resident will take if they sign up right now (1-based).
export function nextPosition(type) {
  const apts = WL_DATA[type];
  return (apts ? apts.length : 0) + 1;
}

// Remembered "you joined here" markers, so the queue can highlight the
// resident's own position after they submit. Kept separate from the contact
// details (WL_STORE_KEY) and guarded since localStorage can be unavailable.
export const WL_JOINED_KEY = 'wl-joined';

function readJoined() {
  try { return JSON.parse(localStorage.getItem(WL_JOINED_KEY)) || {}; }
  catch { return {}; }
}

function saveJoined(type, pos) {
  try {
    const j = readJoined();
    j[type] = pos;
    localStorage.setItem(WL_JOINED_KEY, JSON.stringify(j));
  } catch { /* ignore */ }
}

// Animate the queue-depth meter for a queue, if its fill element is present.
function updateQueueMeter(type) {
  const fill = document.getElementById(type + '-meter');
  if (!fill) return;
  const count = WL_DATA[type] ? WL_DATA[type].length : 0;
  const cap = Math.max(count, 8); // soft cap so a short queue still reads as "short"
  fill.style.width = Math.round((count / cap) * 100) + '%';
}

export function renderSlots(type) {
  const apts = WL_DATA[type];
  const slotsEl = document.getElementById(type + '-slots');
  const footerEl = document.getElementById(type + '-footer');
  if (!slotsEl) return;
  slotsEl.innerHTML = '';

  if (apts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'wl-slot-empty';
    empty.textContent = 'No one on the list yet — be the first to sign up below.';
    slotsEl.appendChild(empty);
    if (footerEl) footerEl.innerHTML = '';
  } else {
    apts.forEach(function (apt, i) {
      const slot = document.createElement('div');
      slot.className = 'wl-slot filled';
      slot.innerHTML =
        '<span class="wl-slot-pos">#' + (i + 1) + '</span>' +
        '<span class="wl-slot-apt">' + apt + '</span>';
      slotsEl.appendChild(slot);
    });
    const next = apts.length + 1;
    if (footerEl) footerEl.innerHTML =
      '<strong>' + apts.length + ' ' + (apts.length === 1 ? 'person' : 'people') + '</strong> currently waiting · Sign up to join at <strong>#' + next + '</strong>';
  }

  // After the resident has joined, mark their projected position in the queue.
  const joined = readJoined()[type];
  if (joined) {
    const you = document.createElement('div');
    you.className = 'wl-slot you';
    you.innerHTML =
      '<span class="wl-slot-pos">#' + joined + '</span>' +
      '<span class="wl-slot-apt">You — request sent</span>' +
      '<span class="wl-you-badge">You</span>';
    slotsEl.appendChild(you);
  }

  updateQueueMeter(type);
}

// Filter the visible slots of a queue by position number or identifier.
export function filterQueue(type, query) {
  const q = (query || '').toLowerCase().trim();
  const slots = document.querySelectorAll('#' + type + '-slots .wl-slot');
  let any = false;
  slots.forEach(s => {
    const show = !q || s.textContent.toLowerCase().includes(q);
    s.style.display = show ? '' : 'none';
    if (show) any = true;
  });
  const noMatch = document.getElementById(type + '-no-match');
  if (noMatch) noMatch.hidden = any || !q;
}

export function switchWLTab(type, btn) {
  document.querySelectorAll('.wl-tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
    b.setAttribute('tabindex', '-1');
  });
  document.querySelectorAll('.wl-panel').forEach(p => p.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.setAttribute('tabindex', '0');
  }
  const panel = document.getElementById('wl-panel-' + type);
  if (panel) panel.classList.add('active');
  // Refresh the live "you'll join at #N" hints for the newly shown panel.
  updateJoinHints();
}

// ── Parking sign-up wizard ──────────────────────────────────────────────────
// The parking form is presented as a 3-step wizard (contact → preferences →
// review). All inputs stay in the DOM the whole time, so submitWaitlist() still
// reads them exactly as before — the steps are purely a presentation layer.

// Each queue's form is a small wizard: parking has 3 steps (contact →
// preferences → review), storage has 2 (contact → review). State and step
// count are tracked per type so the two wizards don't interfere.
const wlStep = { parking: 1, storage: 1 };
const WL_MAX_STEP = { parking: 3, storage: 2 };

function wlShowStep(type) {
  const form = document.getElementById(type + '-form');
  if (!form) return;
  const step = wlStep[type];
  form.querySelectorAll('.wl-step').forEach((s, i) => s.classList.toggle('active', i === step - 1));
  form.querySelectorAll('.wl-dot').forEach((d, i) => d.classList.toggle('done', i < step));
}

function wlContactValid(type) {
  const prefix = type === 'parking' ? 'p' : 's';
  const name  = (document.getElementById(prefix + '-name')  || {}).value || '';
  const unit  = (document.getElementById(prefix + '-unit')  || {}).value || '';
  const email = (document.getElementById(prefix + '-email') || {}).value || '';
  return name.trim() && unit.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function wlNext(type = 'parking') {
  const err = document.getElementById(type + '-error');
  if (wlStep[type] === 1 && !wlContactValid(type)) {
    if (err) err.style.display = 'block';
    return;
  }
  if (err) err.style.display = 'none';
  wlStep[type] = Math.min(wlStep[type] + 1, WL_MAX_STEP[type]);
  if (wlStep[type] === WL_MAX_STEP[type]) wlBuildReview(type);
  wlShowStep(type);
}

export function wlBack(type = 'parking') {
  wlStep[type] = Math.max(wlStep[type] - 1, 1);
  wlShowStep(type);
}

function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function wlBuildReview(type) {
  const review = document.getElementById(type + '-review');
  if (!review) return;
  const prefix = type === 'parking' ? 'p' : 's';
  const phone = val(prefix + '-phone');
  let rows = [
    ['Name', val(prefix + '-name')],
    ['Apartment', val(prefix + '-unit')],
    ['Email', val(prefix + '-email')],
    phone ? ['Phone', phone] : null,
  ];
  if (type === 'parking') {
    rows.push(['Preference', val('p-preference')]);
    rows.push(['Requesting', val('p-spot-number')]);
  }
  rows.push(['Queue position', '#' + nextPosition(type)]);
  review.innerHTML = rows.filter(Boolean).map(([k, v]) =>
    '<div class="wl-review-row"><span class="wl-review-k">' + k +
    '</span><span class="wl-review-v">' + escapeText(v) + '</span></div>'
  ).join('');
}

function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Update every "you'll join at #N" hint and the live wizard position chip.
function updateJoinHints() {
  document.querySelectorAll('[data-join-hint]').forEach(el => {
    const type = el.getAttribute('data-join-hint');
    el.textContent = '#' + nextPosition(type);
  });
}

// Remembered resident details, so the waitlist form is pre-filled on return.
// Wrapped in try/catch since localStorage can be unavailable (private mode, etc.).
export const WL_STORE_KEY = 'wl-resident';

function readResident() {
  try { return JSON.parse(localStorage.getItem(WL_STORE_KEY)) || {}; }
  catch { return {}; }
}

function saveResident(r) {
  try { localStorage.setItem(WL_STORE_KEY, JSON.stringify(r)); } catch { /* ignore */ }
}

// Pre-fill any empty waitlist contact fields with the resident's saved details.
// Every lookup is guarded so this is safe to call on pages missing the fields.
export function prefillWaitlist() {
  const r = readResident();
  if (!r.name && !r.unit && !r.email && !r.phone) return;
  ['p', 's'].forEach(prefix => {
    const set = (field, val) => {
      const el = document.getElementById(prefix + '-' + field);
      if (el && !el.value && val) el.value = val;
    };
    set('name', r.name);
    set('unit', r.unit);
    set('email', r.email);
    set('phone', r.phone);
  });
}

// Where sign-ups go. When a form-service URL is configured the request is
// POSTed there (which feeds the responses Sheet the auto-sync reads, so the
// public queue updates itself). Until the board configures it, this stays empty
// and submissions fall back to the email (mailto:) flow — so the form always
// works. See docs/waitlist-automation.html for setup.
export const WL_SUBMIT = {
  // A Google Form POST endpoint, e.g.
  //   'https://docs.google.com/forms/d/e/FORM_ID/formResponse'
  url: '',
  // Map our fields to that form's entry IDs, e.g. { list: 'entry.123', ... }.
  // Only the keys you map are sent; the "list" value is "Parking Spot"/"Storage Unit".
  fields: { list: '', name: '', unit: '', email: '', phone: '', preference: '', spot: '' },
};

// Fire-and-forget POST to a configured form service. Uses no-cors because
// services like Google Forms don't return CORS headers; we can't read the
// response, so callers optimistically treat a sent request as success.
// `fields` maps our logical keys to the service's field names (e.g. entry IDs);
// `values` holds the data. Only mapped, non-empty values are sent.
function postToService(url, fields, values) {
  const fd = new FormData();
  const f = fields || {};
  Object.keys(f).forEach(key => {
    if (f[key] && values[key]) fd.append(f[key], values[key]);
  });
  return fetch(url, { method: 'POST', mode: 'no-cors', body: fd });
}

export function submitWaitlist(type) {
  const prefix = type === 'parking' ? 'p' : 's';
  const name  = document.getElementById(prefix + '-name').value.trim();
  const unit  = document.getElementById(prefix + '-unit').value.trim();
  const email = document.getElementById(prefix + '-email').value.trim();
  const phone = document.getElementById(prefix + '-phone').value.trim();
  const errorEl = document.getElementById(type + '-error');

  const valid = name && unit && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  errorEl.style.display = valid ? 'none' : 'block';
  if (!valid) return;

  // Parking asks two extra preference questions; the storage form has neither,
  // so each lookup is guarded and the values are only used when present.
  let preference = '', spot = '';
  if (type === 'parking') {
    const prefEl = document.getElementById('p-preference');
    const spotEl = document.getElementById('p-spot-number');
    if (prefEl && prefEl.value) preference = prefEl.value;
    if (spotEl && spotEl.value) spot = spotEl.value;
  }

  // Remember the resident's details so the form is pre-filled next time, and
  // record the position they're joining at so the queue can highlight "you".
  saveResident({ name, unit, email, phone });
  saveJoined(type, nextPosition(type));

  const label = type === 'parking' ? 'Parking Spot' : 'Storage Unit';

  if (WL_SUBMIT.url) {
    // Captured submission — feeds the responses Sheet that auto-updates the queue.
    try { postToService(WL_SUBMIT.url, WL_SUBMIT.fields, { list: label, name, unit, email, phone, preference, spot }); }
    catch { /* network hiccup — the email fallback link in the success panel covers it */ }
  } else {
    // Email fallback — opens the resident's mail app with a pre-filled message.
    let extra = '';
    if (preference) extra += '\nSpot Preference: ' + preference;
    if (spot)       extra += '\nRequesting: ' + spot;
    const subject = encodeURIComponent('Waiting List Request – ' + label);
    const body    = encodeURIComponent(
      'Waiting List: ' + label +
      '\n\nName: ' + name +
      '\nApartment: ' + unit +
      '\nEmail: ' + email +
      (phone ? '\nPhone: ' + phone : '') +
      extra
    );
    window.location.href = 'mailto:board@example.com?subject=' + subject + '&body=' + body;
  }

  document.getElementById(type + '-form').style.display = 'none';
  document.getElementById(type + '-success').style.display = 'block';
  // Re-render the queue so the resident's new position is highlighted.
  renderSlots(type);
  if (window.showToast) window.showToast("You're on the list! ✓");
}

// ── Maintenance Request Wizard ──
export const MAINT_EMAIL = 'info@gramatanmanagement.com';

// Optional capture for maintenance requests. When a form-service URL is set the
// request is POSTed there (so the agent gets a logged entry); otherwise it falls
// back to the email draft. Leave url empty to keep the email behavior.
export const MAINT_SUBMIT = {
  url: '',
  fields: { category: '', urgency: '', name: '', unit: '', phone: '', email: '', desc: '' },
};

export function buildMaintenanceEmail(d) {
  const subject = 'Maintenance Request — Apt ' + d.unit + ' — ' + d.category +
    (d.urgency === 'Urgent' ? ' (URGENT)' : '');
  const body =
    'Maintenance Request — 555 McLean Ave' +
    '\n\nCategory: ' + d.category +
    '\nUrgency: '  + d.urgency +
    '\n\nName: '   + d.name +
    '\nApartment: ' + d.unit +
    (d.phone ? '\nPhone: ' + d.phone : '') +
    (d.email ? '\nEmail: ' + d.email : '') +
    '\n\nDescription:\n' + d.desc;
  return { subject, body };
}

let mrStep = 1;
let mrReturnFocus = null;

function mrShowStep() {
  document.querySelectorAll('.mr-step').forEach((s, i) => s.classList.toggle('active', i === mrStep - 1));
  document.querySelectorAll('.mr-dot').forEach((d, i) => d.classList.toggle('done', i < mrStep));
}

function mrError(n, show) {
  const el = document.getElementById('mr-error-' + n);
  if (el) el.style.display = show ? 'block' : 'none';
}

export function openMaintWizard(e) {
  if (e) e.preventDefault();
  mrReturnFocus = document.activeElement;
  mrStep = 1;
  mrShowStep();
  const overlay = document.getElementById('mr-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const first = overlay.querySelector('.mr-cat-btn');
  if (first) first.focus();
}

export function closeMaintWizard() {
  document.getElementById('mr-overlay').classList.remove('open');
  document.body.style.overflow = '';
  if (mrReturnFocus && mrReturnFocus.focus) mrReturnFocus.focus();
}

export function selectMaintCategory(btn) {
  document.querySelectorAll('.mr-cat-btn').forEach(b => {
    b.classList.remove('selected');
    b.setAttribute('aria-pressed', 'false');
  });
  btn.classList.add('selected');
  btn.setAttribute('aria-pressed', 'true');
}

export function maintNext() {
  if (mrStep === 1) {
    const cat = document.querySelector('.mr-cat-btn.selected');
    mrError(1, !cat);
    if (!cat) return;
  }
  if (mrStep === 2) {
    const name  = document.getElementById('mr-name').value.trim();
    const unit  = document.getElementById('mr-unit').value.trim();
    const email = document.getElementById('mr-email').value.trim();
    const ok = name && unit && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    mrError(2, !ok);
    if (!ok) return;
  }
  mrStep = Math.min(mrStep + 1, 3);
  mrShowStep();
}

export function maintBack() {
  mrStep = Math.max(mrStep - 1, 1);
  mrShowStep();
}

export function submitMaintenance() {
  const desc = document.getElementById('mr-desc').value.trim();
  mrError(3, !desc);
  if (!desc) return;

  const catBtn  = document.querySelector('.mr-cat-btn.selected');
  const urgency = document.querySelector('input[name="mr-urgency"]:checked');
  const d = {
    category: catBtn ? catBtn.dataset.category : 'Other',
    urgency:  urgency ? urgency.value : 'Routine',
    name:  document.getElementById('mr-name').value.trim(),
    unit:  document.getElementById('mr-unit').value.trim(),
    phone: document.getElementById('mr-phone').value.trim(),
    email: document.getElementById('mr-email').value.trim(),
    desc,
  };

  if (MAINT_SUBMIT.url) {
    try { postToService(MAINT_SUBMIT.url, MAINT_SUBMIT.fields, d); }
    catch { /* network hiccup — agent can still be reached by email */ }
    if (window.showToast) window.showToast('Request sent to the managing agent ✓');
  } else {
    const { subject, body } = buildMaintenanceEmail(d);
    window.location.href = 'mailto:' + MAINT_EMAIL +
      '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    if (window.showToast) window.showToast('Request drafted — press Send in your email app ✓');
  }

  mrStep = 4;
  mrShowStep();
}

export function init() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  renderSlots('parking');
  renderSlots('storage');
  prefillWaitlist();

  // Live inline validation — turn a field green once its value looks valid.
  document.querySelectorAll('.wl-field input').forEach(inp => {
    const check = () => {
      const v = inp.value.trim();
      const ok = inp.type === 'email'
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        : !!v;
      inp.classList.toggle('is-valid', ok);
    };
    inp.addEventListener('input', check);
    check();
  });

  // Populate the "you'll join at #N" hints on first paint.
  updateJoinHints();
}
