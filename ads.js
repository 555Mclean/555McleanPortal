// Sponsor (ad) slot handling for the portal.
//
// The markup for #sponsors is generated at build time from data/ads.json and
// ships hidden. This module asks AdSense to fill each unit and only then
// reveals the section — if the ads are blocked, unsold, or the script never
// loads (all common here), residents see the page exactly as before instead of
// a labelled empty box. Everything degrades to "no section" on failure.

// How long to wait for AdSense to mark the units before giving up and leaving
// the section hidden.
export const AD_FILL_TIMEOUT = 4000;

// AdSense stamps each <ins> with data-ad-status once it decides.
// true = filled, false = unfilled, null = not decided yet.
export function unitStatus(el) {
  const status = el.getAttribute('data-ad-status');
  if (status === 'filled') return true;
  if (status === 'unfilled') return false;
  return null;
}

// Whole-section verdict: true as soon as any unit fills, false once every unit
// has come back unfilled, null while any is still undecided.
export function fillVerdict(units) {
  let allDecided = true;
  for (const el of units) {
    const status = unitStatus(el);
    if (status === true) return true;
    if (status === null) allDecided = false;
  }
  return allDecided ? false : null;
}

function reveal(section) {
  section.hidden = false;
  const nav = document.getElementById('sponsors-nav');
  if (nav) nav.hidden = false;
}

export function initAds(doc = document) {
  const section = doc.getElementById('sponsors');
  if (!section) return false; // ads off — build.js left the section out entirely

  const units = Array.from(section.querySelectorAll('ins.adsbygoogle'));
  if (!units.length) return false;

  // Hand each unit to AdSense. The queue works whether or not the script has
  // finished loading, and a throw here must not take the rest of init with it.
  try {
    units.forEach(() => { (window.adsbygoogle = window.adsbygoogle || []).push({}); });
  } catch { return false; }

  let settled = false;
  const finish = () => {
    if (settled) return;
    const verdict = fillVerdict(units);
    if (verdict === true) { settled = true; reveal(section); }
    else if (verdict === false) { settled = true; } // stays hidden
  };

  // data-ad-status is set asynchronously, so watch for it rather than polling.
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => {
      finish();
      if (settled) observer.disconnect();
    });
    for (const el of units) observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    setTimeout(() => { observer.disconnect(); finish(); settled = true; }, AD_FILL_TIMEOUT);
  } else {
    setTimeout(finish, AD_FILL_TIMEOUT);
  }

  return true;
}
