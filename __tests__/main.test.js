import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WL_DATA, renderSlots, switchWLTab, submitWaitlist, init,
  prefillWaitlist, WL_STORE_KEY,
  buildMaintenanceEmail, openMaintWizard, closeMaintWizard, selectMaintCategory,
  maintNext, maintBack, submitMaintenance, MAINT_EMAIL,
} from '../main.js';

// ─── DOM fixture ────────────────────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = `
    <div id="parking-slots"></div>
    <div id="parking-footer"></div>
    <div id="storage-slots"></div>
    <div id="storage-footer"></div>

    <button class="wl-tab-btn active" id="btn-parking">Parking</button>
    <button class="wl-tab-btn" id="btn-storage">Storage</button>

    <div class="wl-panel active" id="wl-panel-parking">
      <div id="parking-form">
        <input id="p-name" />
        <input id="p-unit" />
        <input id="p-email" />
        <input id="p-phone" />
      </div>
      <div id="parking-error" style="display:none"></div>
      <div id="parking-success" style="display:none"></div>
    </div>

    <div class="wl-panel" id="wl-panel-storage">
      <div id="storage-form">
        <input id="s-name" />
        <input id="s-unit" />
        <input id="s-email" />
        <input id="s-phone" />
      </div>
      <div id="storage-error" style="display:none"></div>
      <div id="storage-success" style="display:none"></div>
    </div>
  `;
}

function fillForm(prefix, { name = '', unit = '', email = '', phone = '' } = {}) {
  document.getElementById(prefix + '-name').value = name;
  document.getElementById(prefix + '-unit').value = unit;
  document.getElementById(prefix + '-email').value = email;
  document.getElementById(prefix + '-phone').value = phone;
}

// ─── renderSlots ────────────────────────────────────────────────────────────

describe('renderSlots', () => {
  beforeEach(() => {
    setupDOM();
    WL_DATA.parking = ['2A', '4B', '7C'];
    WL_DATA.storage = ['1D', '3A', '5B', '6C', '8A'];
  });

  it('renders one filled slot per apartment in the parking list', () => {
    renderSlots('parking');
    expect(document.querySelectorAll('#parking-slots .wl-slot.filled')).toHaveLength(3);
  });

  it('renders one filled slot per apartment in the storage list', () => {
    renderSlots('storage');
    expect(document.querySelectorAll('#storage-slots .wl-slot.filled')).toHaveLength(5);
  });

  it('numbers positions starting at #1', () => {
    renderSlots('parking');
    const positions = document.querySelectorAll('#parking-slots .wl-slot-pos');
    expect(positions[0].textContent).toBe('#1');
    expect(positions[1].textContent).toBe('#2');
    expect(positions[2].textContent).toBe('#3');
  });

  it('displays the slot identifier in each slot', () => {
    renderSlots('parking');
    const apts = document.querySelectorAll('#parking-slots .wl-slot-apt');
    expect(apts[0].textContent).toBe('2A');
    expect(apts[1].textContent).toBe('4B');
    expect(apts[2].textContent).toBe('7C');
  });

  it('uses plural "people" in the footer when count > 1', () => {
    renderSlots('parking'); // 3 entries
    expect(document.getElementById('parking-footer').innerHTML).toContain('people');
    expect(document.getElementById('parking-footer').innerHTML).not.toContain('>1 person<');
  });

  it('uses singular "person" in the footer when count is 1', () => {
    WL_DATA.parking = ['2A'];
    renderSlots('parking');
    const footer = document.getElementById('parking-footer').innerHTML;
    expect(footer).toContain('person');
    expect(footer).not.toContain('people');
  });

  it('shows the correct next-position number in the footer', () => {
    renderSlots('parking'); // 3 entries → next is #4
    expect(document.getElementById('parking-footer').innerHTML).toContain('#4');
  });

  it('shows the empty-state message when the list is empty', () => {
    WL_DATA.parking = [];
    renderSlots('parking');
    const emptyEl = document.querySelector('#parking-slots .wl-slot-empty');
    expect(emptyEl).not.toBeNull();
    expect(emptyEl.textContent).toContain('No one on the list yet');
  });

  it('clears the footer when the list is empty', () => {
    WL_DATA.parking = [];
    renderSlots('parking');
    expect(document.getElementById('parking-footer').innerHTML).toBe('');
  });

  it('clears previous slots before re-rendering', () => {
    renderSlots('parking'); // renders 3 slots
    WL_DATA.parking = ['5A'];
    renderSlots('parking'); // should now show only 1
    expect(document.querySelectorAll('#parking-slots .wl-slot.filled')).toHaveLength(1);
  });
});

// ─── switchWLTab ─────────────────────────────────────────────────────────────

describe('switchWLTab', () => {
  beforeEach(setupDOM);

  it('adds the active class to the clicked button', () => {
    const storageBtn = document.getElementById('btn-storage');
    switchWLTab('storage', storageBtn);
    expect(storageBtn.classList.contains('active')).toBe(true);
  });

  it('removes the active class from all other buttons', () => {
    const storageBtn = document.getElementById('btn-storage');
    switchWLTab('storage', storageBtn);
    expect(document.getElementById('btn-parking').classList.contains('active')).toBe(false);
  });

  it('shows the panel matching the selected type', () => {
    const storageBtn = document.getElementById('btn-storage');
    switchWLTab('storage', storageBtn);
    expect(document.getElementById('wl-panel-storage').classList.contains('active')).toBe(true);
  });

  it('hides the previously active panel', () => {
    const storageBtn = document.getElementById('btn-storage');
    switchWLTab('storage', storageBtn);
    expect(document.getElementById('wl-panel-parking').classList.contains('active')).toBe(false);
  });

  it('can switch back from storage to parking', () => {
    const storageBtn = document.getElementById('btn-storage');
    switchWLTab('storage', storageBtn);

    const parkingBtn = document.getElementById('btn-parking');
    switchWLTab('parking', parkingBtn);

    expect(document.getElementById('wl-panel-parking').classList.contains('active')).toBe(true);
    expect(document.getElementById('wl-panel-storage').classList.contains('active')).toBe(false);
    expect(parkingBtn.classList.contains('active')).toBe(true);
    expect(storageBtn.classList.contains('active')).toBe(false);
  });
});

// ─── submitWaitlist ──────────────────────────────────────────────────────────

describe('submitWaitlist', () => {
  let locationMock;

  beforeEach(() => {
    setupDOM();
    locationMock = { href: '' };
    vi.stubGlobal('location', locationMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── validation ──

  describe('validation', () => {
    it('shows the error element when name is missing', () => {
      fillForm('p', { unit: '4B', email: 'jane@test.com' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('block');
    });

    it('does not navigate when name is missing', () => {
      fillForm('p', { unit: '4B', email: 'jane@test.com' });
      submitWaitlist('parking');
      expect(locationMock.href).toBe('');
    });

    it('shows the error element when apartment number is missing', () => {
      fillForm('p', { name: 'Jane', email: 'jane@test.com' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('block');
    });

    it('shows the error element when email is missing', () => {
      fillForm('p', { name: 'Jane', unit: '4B' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('block');
    });

    it('shows the error element when email has no @ symbol', () => {
      fillForm('p', { name: 'Jane', unit: '4B', email: 'notanemail' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('block');
    });

    it('shows the error element when email has nothing after @', () => {
      fillForm('p', { name: 'Jane', unit: '4B', email: 'jane@' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('block');
    });

    it('shows the error element when email has no TLD', () => {
      fillForm('p', { name: 'Jane', unit: '4B', email: 'jane@domain' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('block');
    });

    it('shows the error element when the local part is missing', () => {
      fillForm('p', { name: 'Jane', unit: '4B', email: '@domain.com' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('block');
    });

    it('hides the error element on a valid submission', () => {
      document.getElementById('parking-error').style.display = 'block'; // pre-set
      fillForm('p', { name: 'Jane', unit: '4B', email: 'jane@test.com' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('none');
    });

    it('accepts emails with dots in the local part', () => {
      fillForm('p', { name: 'Jane', unit: '4B', email: 'jane.smith@test.com' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('none');
    });

    it('accepts emails with multi-part TLDs', () => {
      fillForm('p', { name: 'Jane', unit: '4B', email: 'jane@domain.co.uk' });
      submitWaitlist('parking');
      expect(document.getElementById('parking-error').style.display).toBe('none');
    });
  });

  // ── successful parking submission ──

  describe('valid parking submission', () => {
    beforeEach(() => {
      fillForm('p', {
        name: 'Jane Smith',
        unit: '4B',
        email: 'jane@example.com',
        phone: '(914) 555-1234',
      });
      submitWaitlist('parking');
    });

    it('navigates to a mailto: URL', () => {
      expect(locationMock.href).toMatch(/^mailto:board@example\.com/);
    });

    it('includes the parking subject line', () => {
      expect(locationMock.href).toContain(
        encodeURIComponent('Waiting List Request – Parking Spot')
      );
    });

    it('includes the submitter name in the body', () => {
      expect(decodeURIComponent(locationMock.href)).toContain('Name: Jane Smith');
    });

    it('includes the apartment number in the body', () => {
      expect(decodeURIComponent(locationMock.href)).toContain('Apartment: 4B');
    });

    it('includes the email address in the body', () => {
      expect(decodeURIComponent(locationMock.href)).toContain('Email: jane@example.com');
    });

    it('includes the phone number in the body when provided', () => {
      expect(decodeURIComponent(locationMock.href)).toContain('Phone: (914) 555-1234');
    });

    it('hides the form on success', () => {
      expect(document.getElementById('parking-form').style.display).toBe('none');
    });

    it('shows the success message on success', () => {
      expect(document.getElementById('parking-success').style.display).toBe('block');
    });
  });

  // ── successful storage submission ──

  describe('valid storage submission', () => {
    beforeEach(() => {
      fillForm('s', { name: 'Bob', unit: '2C', email: 'bob@example.com' });
      submitWaitlist('storage');
    });

    it('includes the storage subject line', () => {
      expect(locationMock.href).toContain(
        encodeURIComponent('Waiting List Request – Storage Unit')
      );
    });

    it('omits the phone line from the body when phone is empty', () => {
      expect(decodeURIComponent(locationMock.href)).not.toContain('Phone:');
    });

    it('shows the storage success message', () => {
      expect(document.getElementById('storage-success').style.display).toBe('block');
    });
  });

  // ── edge cases ──

  it('trims whitespace from name, unit, and email before validation', () => {
    fillForm('p', { name: '  Jane  ', unit: '  4B  ', email: '  jane@test.com  ' });
    submitWaitlist('parking');
    expect(document.getElementById('parking-error').style.display).toBe('none');
    const decoded = decodeURIComponent(locationMock.href);
    expect(decoded).toContain('Name: Jane');
    expect(decoded).toContain('Apartment: 4B');
  });

  it('treats whitespace-only fields as empty during validation', () => {
    fillForm('p', { name: '   ', unit: '4B', email: 'jane@test.com' });
    submitWaitlist('parking');
    expect(document.getElementById('parking-error').style.display).toBe('block');
  });
});

// ─── parking preference questions ─────────────────────────────────────────────

describe('parking preference questions', () => {
  let locationMock;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="wl-panel-parking">
        <div id="parking-form">
          <input id="p-name" /><input id="p-unit" /><input id="p-email" /><input id="p-phone" />
          <select id="p-preference">
            <option value="Whichever becomes available first">first available</option>
            <option value="Indoor">Indoor</option>
            <option value="Outdoor">Outdoor</option>
          </select>
          <select id="p-spot-number">
            <option value="My first spot (I don't have one yet)">first</option>
            <option value="My second spot (I already have one)">second</option>
          </select>
        </div>
        <div id="parking-error" style="display:none"></div>
        <div id="parking-success" style="display:none"></div>
      </div>`;
    locationMock = { href: '' };
    vi.stubGlobal('location', locationMock);
    try { localStorage.clear(); } catch { /* ignore */ }

    document.getElementById('p-name').value = 'Jane';
    document.getElementById('p-unit').value = '4B';
    document.getElementById('p-email').value = 'jane@test.com';
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('includes the chosen spot preference in the email body', () => {
    document.getElementById('p-preference').value = 'Outdoor';
    submitWaitlist('parking');
    expect(decodeURIComponent(locationMock.href)).toContain('Spot Preference: Outdoor');
  });

  it('includes the requested spot number in the email body', () => {
    document.getElementById('p-spot-number').value = 'My second spot (I already have one)';
    submitWaitlist('parking');
    expect(decodeURIComponent(locationMock.href)).toContain('Requesting: My second spot');
  });

  it('defaults to the first-available preference and first spot', () => {
    submitWaitlist('parking');
    const decoded = decodeURIComponent(locationMock.href);
    expect(decoded).toContain('Spot Preference: Whichever becomes available first');
    expect(decoded).toContain("Requesting: My first spot");
  });

  it('remembers the resident details in localStorage after submitting', () => {
    submitWaitlist('parking');
    const saved = JSON.parse(localStorage.getItem(WL_STORE_KEY));
    expect(saved).toMatchObject({ name: 'Jane', unit: '4B', email: 'jane@test.com' });
  });
});

// ─── prefillWaitlist ──────────────────────────────────────────────────────────

describe('prefillWaitlist', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    document.body.innerHTML =
      '<input id="p-name" /><input id="p-unit" /><input id="p-email" /><input id="p-phone" />';
  });

  afterEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  it('fills empty fields from the saved resident details', () => {
    localStorage.setItem(WL_STORE_KEY, JSON.stringify({ name: 'Jane Smith', unit: '4B', email: 'jane@test.com' }));
    prefillWaitlist();
    expect(document.getElementById('p-name').value).toBe('Jane Smith');
    expect(document.getElementById('p-unit').value).toBe('4B');
    expect(document.getElementById('p-email').value).toBe('jane@test.com');
  });

  it('does not overwrite a field the user has already filled', () => {
    localStorage.setItem(WL_STORE_KEY, JSON.stringify({ name: 'Jane Smith' }));
    document.getElementById('p-name').value = 'Bob';
    prefillWaitlist();
    expect(document.getElementById('p-name').value).toBe('Bob');
  });

  it('does nothing when there is no saved resident', () => {
    prefillWaitlist();
    expect(document.getElementById('p-name').value).toBe('');
  });

  it('does not throw when the contact fields are absent', () => {
    document.body.innerHTML = '';
    localStorage.setItem(WL_STORE_KEY, JSON.stringify({ name: 'Jane Smith' }));
    expect(() => prefillWaitlist()).not.toThrow();
  });
});

// ─── Maintenance wizard ──────────────────────────────────────────────────────

describe('buildMaintenanceEmail', () => {
  const base = {
    category: 'Plumbing', urgency: 'Routine',
    name: 'Jane Smith', unit: '4B',
    phone: '(914) 555-1234', email: 'jane@test.com',
    desc: 'Kitchen sink drains slowly.',
  };

  it('includes apartment and category in the subject', () => {
    const { subject } = buildMaintenanceEmail(base);
    expect(subject).toContain('Apt 4B');
    expect(subject).toContain('Plumbing');
  });

  it('appends (URGENT) to the subject when urgency is Urgent', () => {
    const { subject } = buildMaintenanceEmail({ ...base, urgency: 'Urgent' });
    expect(subject).toContain('(URGENT)');
  });

  it('does not mark routine requests as urgent', () => {
    const { subject } = buildMaintenanceEmail(base);
    expect(subject).not.toContain('URGENT');
  });

  it('includes all provided fields in the body', () => {
    const { body } = buildMaintenanceEmail(base);
    expect(body).toContain('Category: Plumbing');
    expect(body).toContain('Urgency: Routine');
    expect(body).toContain('Name: Jane Smith');
    expect(body).toContain('Apartment: 4B');
    expect(body).toContain('Phone: (914) 555-1234');
    expect(body).toContain('Email: jane@test.com');
    expect(body).toContain('Kitchen sink drains slowly.');
  });

  it('omits phone and email lines when empty', () => {
    const { body } = buildMaintenanceEmail({ ...base, phone: '', email: '' });
    expect(body).not.toContain('Phone:');
    expect(body).not.toContain('Email:');
  });
});

describe('maintenance wizard flow', () => {
  let locationMock;

  function setupMrDOM() {
    document.body.innerHTML = `
      <div class="mr-overlay" id="mr-overlay">
        <span class="mr-dot"></span><span class="mr-dot"></span><span class="mr-dot"></span>
        <div class="mr-step active">
          <button class="mr-cat-btn" data-category="Plumbing" aria-pressed="false"></button>
          <button class="mr-cat-btn" data-category="Other" aria-pressed="false"></button>
          <label><input type="radio" name="mr-urgency" value="Routine" checked></label>
          <label><input type="radio" name="mr-urgency" value="Urgent"></label>
          <p id="mr-error-1" style="display:none"></p>
        </div>
        <div class="mr-step">
          <input id="mr-name" /><input id="mr-unit" /><input id="mr-phone" /><input id="mr-email" />
          <p id="mr-error-2" style="display:none"></p>
        </div>
        <div class="mr-step">
          <textarea id="mr-desc"></textarea>
          <p id="mr-error-3" style="display:none"></p>
        </div>
        <div class="mr-step"></div>
      </div>
    `;
  }

  function steps() { return document.querySelectorAll('.mr-step'); }

  beforeEach(() => {
    setupMrDOM();
    locationMock = { href: '' };
    vi.stubGlobal('location', locationMock);
    openMaintWizard();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the overlay and shows step 1', () => {
    expect(document.getElementById('mr-overlay').classList.contains('open')).toBe(true);
    expect(steps()[0].classList.contains('active')).toBe(true);
  });

  it('closes the overlay', () => {
    closeMaintWizard();
    expect(document.getElementById('mr-overlay').classList.contains('open')).toBe(false);
  });

  it('blocks step 1 until a category is chosen', () => {
    maintNext();
    expect(document.getElementById('mr-error-1').style.display).toBe('block');
    expect(steps()[0].classList.contains('active')).toBe(true);
  });

  it('marks the chosen category as selected and pressed', () => {
    const btn = document.querySelector('.mr-cat-btn');
    selectMaintCategory(btn);
    expect(btn.classList.contains('selected')).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('deselects the previous category when another is chosen', () => {
    const [first, second] = document.querySelectorAll('.mr-cat-btn');
    selectMaintCategory(first);
    selectMaintCategory(second);
    expect(first.classList.contains('selected')).toBe(false);
    expect(second.classList.contains('selected')).toBe(true);
  });

  it('advances to step 2 after choosing a category', () => {
    selectMaintCategory(document.querySelector('.mr-cat-btn'));
    maintNext();
    expect(steps()[1].classList.contains('active')).toBe(true);
  });

  it('blocks step 2 when name or apartment is missing', () => {
    selectMaintCategory(document.querySelector('.mr-cat-btn'));
    maintNext();
    maintNext();
    expect(document.getElementById('mr-error-2').style.display).toBe('block');
    expect(steps()[1].classList.contains('active')).toBe(true);
  });

  it('blocks step 2 when the optional email is malformed', () => {
    selectMaintCategory(document.querySelector('.mr-cat-btn'));
    maintNext();
    document.getElementById('mr-name').value = 'Jane';
    document.getElementById('mr-unit').value = '4B';
    document.getElementById('mr-email').value = 'notanemail';
    maintNext();
    expect(document.getElementById('mr-error-2').style.display).toBe('block');
  });

  it('goes back a step with maintBack', () => {
    selectMaintCategory(document.querySelector('.mr-cat-btn'));
    maintNext();
    maintBack();
    expect(steps()[0].classList.contains('active')).toBe(true);
  });

  it('requires a description before submitting', () => {
    submitMaintenance();
    expect(document.getElementById('mr-error-3').style.display).toBe('block');
    expect(locationMock.href).toBe('');
  });

  it('composes the mailto and shows the success step on submit', () => {
    selectMaintCategory(document.querySelector('.mr-cat-btn'));
    maintNext();
    document.getElementById('mr-name').value = 'Jane Smith';
    document.getElementById('mr-unit').value = '4B';
    maintNext();
    document.getElementById('mr-desc').value = 'Sink leaking under cabinet.';
    submitMaintenance();

    expect(locationMock.href).toMatch(new RegExp('^mailto:' + MAINT_EMAIL));
    const decoded = decodeURIComponent(locationMock.href);
    expect(decoded).toContain('Category: Plumbing');
    expect(decoded).toContain('Apartment: 4B');
    expect(decoded).toContain('Sink leaking under cabinet.');
    expect(steps()[3].classList.contains('active')).toBe(true);
  });
});

// ─── showToast integration ────────────────────────────────────────────────────

describe('showToast hooks', () => {
  let locationMock, toastSpy;

  beforeEach(() => {
    setupDOM();
    locationMock = { href: '' };
    vi.stubGlobal('location', locationMock);
    toastSpy = vi.fn();
    window.showToast = toastSpy;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.showToast;
  });

  it('calls window.showToast after a successful waitlist submission', () => {
    fillForm('p', { name: 'Jane', unit: '4B', email: 'jane@test.com' });
    submitWaitlist('parking');
    expect(toastSpy).toHaveBeenCalledOnce();
  });

  it('does not throw when window.showToast is absent on a valid submission', () => {
    delete window.showToast;
    fillForm('p', { name: 'Jane', unit: '4B', email: 'jane@test.com' });
    expect(() => submitWaitlist('parking')).not.toThrow();
  });
});

// ─── maintenance wizard edge cases ─────────────────────────────────────────────

describe('maintenance wizard edge cases', () => {
  let locationMock;

  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.showToast;
  });

  it('calls preventDefault and restores focus through the open/close cycle', () => {
    document.body.innerHTML = `
      <button id="opener">Open</button>
      <div class="mr-overlay" id="mr-overlay">
        <div class="mr-step active"><button class="mr-cat-btn"></button></div>
      </div>`;
    const opener = document.getElementById('opener');
    opener.focus();
    const preventDefault = vi.fn();

    openMaintWizard({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(document.querySelector('.mr-cat-btn'));

    closeMaintWizard();
    expect(document.activeElement).toBe(opener); // focus returned to the trigger
  });

  it('tolerates a missing error element when validation fails', () => {
    locationMock = { href: '' };
    vi.stubGlobal('location', locationMock);
    // No #mr-error-3 element present — submitMaintenance must not throw.
    document.body.innerHTML = `<div class="mr-overlay" id="mr-overlay"><textarea id="mr-desc"></textarea></div>`;
    expect(() => submitMaintenance()).not.toThrow();
    expect(locationMock.href).toBe(''); // still blocked on the empty description
  });

  it('opens without error when there is no category button to focus', () => {
    document.body.innerHTML = `<div class="mr-overlay" id="mr-overlay"></div>`;
    expect(() => openMaintWizard()).not.toThrow();
    expect(document.getElementById('mr-overlay').classList.contains('open')).toBe(true);
  });

  it('falls back to Other / Routine when no category or urgency is selected', () => {
    locationMock = { href: '' };
    vi.stubGlobal('location', locationMock);
    document.body.innerHTML = `
      <div class="mr-overlay" id="mr-overlay">
        <input id="mr-name" value="Jane" />
        <input id="mr-unit" value="4B" />
        <input id="mr-phone" value="" />
        <input id="mr-email" value="" />
        <textarea id="mr-desc">Leak</textarea>
        <p id="mr-error-3" style="display:none"></p>
      </div>`;
    submitMaintenance();
    const decoded = decodeURIComponent(locationMock.href);
    expect(decoded).toContain('Category: Other');
    expect(decoded).toContain('Urgency: Routine');
  });

  it('fires showToast on a successful submission', () => {
    locationMock = { href: '' };
    vi.stubGlobal('location', locationMock);
    const toastSpy = vi.fn();
    window.showToast = toastSpy;
    document.body.innerHTML = `
      <div class="mr-overlay" id="mr-overlay">
        <input id="mr-name" value="Jane" /><input id="mr-unit" value="4B" />
        <input id="mr-phone" value="" /><input id="mr-email" value="" />
        <textarea id="mr-desc">Leak</textarea>
        <p id="mr-error-3" style="display:none"></p>
      </div>`;
    submitMaintenance();
    expect(toastSpy).toHaveBeenCalledOnce();
  });
});

// ─── init ────────────────────────────────────────────────────────────────────

describe('init', () => {
  let observeMock;

  beforeEach(() => {
    WL_DATA.parking = ['2A'];
    WL_DATA.storage = ['1D'];

    document.body.innerHTML = `
      <div class="fade-in"></div>
      <div class="fade-in"></div>
      <div id="parking-slots"></div>
      <div id="parking-footer"></div>
      <div id="storage-slots"></div>
      <div id="storage-footer"></div>
    `;

    observeMock = vi.fn();
    global.IntersectionObserver = vi.fn(function() {
      return { observe: observeMock, unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  it('observes every .fade-in element', () => {
    init();
    expect(observeMock).toHaveBeenCalledTimes(2);
  });

  it('renders parking slots on startup', () => {
    init();
    expect(document.querySelector('#parking-slots .wl-slot')).not.toBeNull();
  });

  it('renders storage slots on startup', () => {
    init();
    expect(document.querySelector('#storage-slots .wl-slot')).not.toBeNull();
  });

  it('adds the visible class to intersecting elements via the observer callback', () => {
    let capturedCallback;
    global.IntersectionObserver = vi.fn(function(cb) {
      capturedCallback = cb;
      return { observe: vi.fn(), unobserve: vi.fn() };
    });

    init();

    const target = document.querySelector('.fade-in');
    capturedCallback([{ isIntersecting: true, target }], {});
    expect(target.classList.contains('visible')).toBe(true);
  });

  it('does not add the visible class for non-intersecting elements', () => {
    let capturedCallback;
    global.IntersectionObserver = vi.fn(function(cb) {
      capturedCallback = cb;
      return { observe: vi.fn(), unobserve: vi.fn() };
    });

    init();

    const target = document.querySelector('.fade-in');
    capturedCallback([{ isIntersecting: false, target }], {});
    expect(target.classList.contains('visible')).toBe(false);
  });
});
