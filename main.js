export const WL_DATA = {
  parking: ['P55501', 'P55502', 'P55503'],
  storage: ['S55501', 'S55502', 'S55503', 'S55504', 'S55505'],
};

export function renderSlots(type) {
  const apts = WL_DATA[type];
  const slotsEl = document.getElementById(type + '-slots');
  const footerEl = document.getElementById(type + '-footer');
  slotsEl.innerHTML = '';

  if (apts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'wl-slot-empty';
    empty.textContent = 'No one on the list yet — sign up below.';
    slotsEl.appendChild(empty);
    footerEl.innerHTML = '';
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
    footerEl.innerHTML =
      '<strong>' + apts.length + ' ' + (apts.length === 1 ? 'person' : 'people') + '</strong> currently waiting · Sign up to join at <strong>#' + next + '</strong>';
  }
}

export function switchWLTab(type, btn) {
  document.querySelectorAll('.wl-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.wl-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('wl-panel-' + type).classList.add('active');
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

  const label   = type === 'parking' ? 'Parking Spot' : 'Storage Unit';
  const subject = encodeURIComponent('Waiting List Request – ' + label);
  const body    = encodeURIComponent(
    'Waiting List: ' + label +
    '\n\nName: ' + name +
    '\nApartment: ' + unit +
    '\nEmail: ' + email +
    (phone ? '\nPhone: ' + phone : '')
  );

  window.location.href = 'mailto:board@example.com?subject=' + subject + '&body=' + body;

  document.getElementById(type + '-form').style.display = 'none';
  document.getElementById(type + '-success').style.display = 'block';
  if (window.showToast) window.showToast("You're on the list! ✓");
}

export function submitNewsletter() {
  const name    = document.getElementById('nl-name').value.trim();
  const unit    = document.getElementById('nl-unit').value.trim();
  const email   = document.getElementById('nl-email').value.trim();
  const phone   = document.getElementById('nl-phone').value.trim();
  const errorEl = document.getElementById('nl-error');

  const valid = name && unit && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  errorEl.style.display = valid ? 'none' : 'block';
  if (!valid) return;

  const subject = encodeURIComponent('Building Updates Sign-Up — 555 McLean Ave');
  const body    = encodeURIComponent(
    'Building Updates Sign-Up' +
    '\n\nName: '    + name +
    '\nApartment: ' + unit +
    '\nEmail: '     + email +
    (phone ? '\nPhone: ' + phone : '')
  );

  window.location.href = 'mailto:board@example.com?subject=' + subject + '&body=' + body;

  document.getElementById('nl-form').style.display = 'none';
  document.getElementById('nl-success').style.display = 'block';
  if (window.showToast) window.showToast("You're signed up! ✓");
}

// ── Maintenance Request Wizard ──
export const MAINT_EMAIL = 'info@gramatanmanagement.com';

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
  const { subject, body } = buildMaintenanceEmail({
    category: catBtn ? catBtn.dataset.category : 'Other',
    urgency:  urgency ? urgency.value : 'Routine',
    name:  document.getElementById('mr-name').value.trim(),
    unit:  document.getElementById('mr-unit').value.trim(),
    phone: document.getElementById('mr-phone').value.trim(),
    email: document.getElementById('mr-email').value.trim(),
    desc,
  });

  window.location.href = 'mailto:' + MAINT_EMAIL +
    '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

  mrStep = 4;
  mrShowStep();
  if (window.showToast) window.showToast('Request drafted — press Send in your email app ✓');
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
}
