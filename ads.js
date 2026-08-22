// Sponsor (ad) slot handling for the portal.
//
// The markup for #sponsors is generated at build time from data/ads.json. This
// module asks AdSense to fill each unit and shows the section only if one
// actually fills — if the ads are blocked, unsold, or the script never loads
// (all common here), residents see the page exactly as before instead of a
// labelled empty box.
//
// The section therefore ships in a "pending" state rather than hidden:
// AdSense measures the slot's width to decide what to serve and refuses a
// zero-width slot, so display:none would deadlock — no width, no fill, no
// reveal. Pending keeps the section full-width and in the flow but collapses
// its height and hides its heading, so it gives AdSense a real width while
// taking up no visible space.

// Class the build ships on the section; removed to reveal it.
export const PENDING_CLASS = 'ads-pending';

// How long to wait for AdSense to mark the units before giving up. Generous:
// while pending the section is already invisible, so waiting costs nothing,
// and a slow connection should still get its chance to fill.
export const AD_FILL_TIMEOUT = 10000;

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

export function initAds(doc = document) {
  const section = doc.getElementById('sponsors');
  if (!section) return false; // ads off — build.js left the section out entirely

  const units = Array.from(section.querySelectorAll('ins.adsbygoogle'));
  if (!units.length) return false;

  const reveal = () => {
    section.classList.remove(PENDING_CLASS);
    const nav = doc.getElementById('sponsors-nav');
    if (nav) nav.hidden = false;
  };

  // Giving up removes the units outright rather than just hiding the section:
  // an <ins> left inside a hidden container can still fill later and would then
  // count as an impression no resident ever saw.
  const giveUp = () => {
    for (const el of units) el.remove();
    section.hidden = true;
  };

  // Hand each unit to AdSense. The queue works whether or not the script has
  // finished loading, and a throw here must not take the rest of init with it.
  try {
    units.forEach(() => { (window.adsbygoogle = window.adsbygoogle || []).push({}); });
  } catch {
    giveUp();
    return false;
  }

  let settled = false;
  const settle = verdict => {
    if (settled || verdict === null) return;
    settled = true;
    if (verdict) reveal(); else giveUp();
  };

  // data-ad-status is set asynchronously, so watch for it rather than polling.
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => {
      settle(fillVerdict(units));
      if (settled) observer.disconnect();
    });
    for (const el of units) observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    setTimeout(() => {
      // No answer by now counts as unfilled. Disconnect first so the removal
      // below can't re-enter through the observer.
      observer.disconnect();
      settle(fillVerdict(units) ?? false);
    }, AD_FILL_TIMEOUT);
  } else {
    setTimeout(() => settle(fillVerdict(units) ?? false), AD_FILL_TIMEOUT);
  }

  return true;
}
