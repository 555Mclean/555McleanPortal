import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WL_DATA, renderSlots, switchWLTab, submitWaitlist, init } from '../main.js';

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
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: observeMock,
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
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
    global.IntersectionObserver = vi.fn().mockImplementation((cb) => {
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
    global.IntersectionObserver = vi.fn().mockImplementation((cb) => {
      capturedCallback = cb;
      return { observe: vi.fn(), unobserve: vi.fn() };
    });

    init();

    const target = document.querySelector('.fade-in');
    capturedCallback([{ isIntersecting: false, target }], {});
    expect(target.classList.contains('visible')).toBe(false);
  });
});
