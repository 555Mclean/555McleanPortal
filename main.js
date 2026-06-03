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
