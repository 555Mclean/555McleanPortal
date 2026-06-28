// Client-side "Ask the portal" assistant — no backend, no API keys, no cost.
// It matches a resident's question against the page's FAQ plus a small curated
// set of portal topics, and shows the best answers with links. Pure ranking
// logic is exported and unit-tested; the DOM wiring is in initAssistant().

const STOPWORDS = new Set([
  'the','a','an','is','are','do','does','did','i','my','to','for','of','on','in',
  'how','what','when','where','can','could','should','would','me','you','your',
  'our','and','or','at','it','this','that','please','need','want','about','with',
  'get','am','be','if','there','here','from','any','will',
]);

// Lower-case, strip punctuation, drop stopwords → meaningful tokens.
export function tokenize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(t => t && !STOPWORDS.has(t));
}

// Score one knowledge entry against the query tokens. Keyword hits weigh most,
// then title words, then body words.
export function scoreEntry(queryTokens, entry) {
  if (!queryTokens.length) return 0;
  const kw = entry.keywords || [];
  const titleTokens = tokenize(entry.title || '');
  const bodyTokens = tokenize(entry.body || '');
  let score = 0;
  for (const t of queryTokens) {
    if (kw.includes(t)) score += 3;
    if (titleTokens.includes(t)) score += 2;
    if (bodyTokens.includes(t)) score += 1;
  }
  return score;
}

// Rank entries for a query; returns the best matches (score > 0), highest first.
export function rankEntries(query, entries, limit = 3) {
  const q = tokenize(query);
  return entries
    .map(e => ({ e, score: scoreEntry(q, e) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.e);
}

// Curated portal topics. Links resolve to on-page sections or doc pages.
export const ASSISTANT_TOPICS = [
  { id: 'maintenance', title: 'Submit a maintenance request',
    keywords: ['maintenance','repair','fix','broken','leak','plumbing','electrical','heat','hot','water','appliance','request','service','clog','drain'],
    body: 'Use the Maintenance Request form in the Quick Actions bar at the top of the page.',
    action: 'maintenance', link: '#', linkText: 'Open request form' },
  { id: 'parking', title: 'Parking waiting list',
    keywords: ['parking','spot','car','garage','waitlist','waiting','list','queue','space'],
    body: 'Join the parking waiting list in the Parking Waiting List section — the queue and sign-up form are in one place.',
    link: '#waitlist', linkText: 'Go to Waiting Lists' },
  { id: 'pay', title: 'Pay maintenance (ClickPay)',
    keywords: ['pay','payment','fees','fee','clickpay','bill','billing','autopay','charge','dues','online'],
    body: 'Pay online through ClickPay. The setup guide walks you through registering and autopay.',
    link: './docs/clickpay-guide.html', linkText: 'ClickPay setup guide' },
  { id: 'houserules', title: 'House rules',
    keywords: ['rules','rule','noise','pets','pet','quiet','laundry','guests','guest','amenities','common','trash','recycling'],
    body: 'Read the building house rules covering noise, pets, laundry, guests, and more.',
    link: './docs/house-rules.html', linkText: 'Read house rules' },
  { id: 'move', title: 'Moving in or out',
    keywords: ['move','moving','movein','moveout','elevator','deposit','relocate'],
    body: 'Moves must be scheduled in advance. See the move policy for hours, deposits, and elevator booking.',
    link: './docs/move-policy.html', linkText: 'Move policy' },
  { id: 'insurance', title: 'Insurance requirements',
    keywords: ['insurance','ho6','ho4','liability','policy','coverage','insured'],
    body: 'Shareholders must carry an HO-6 policy with at least $300,000 liability. See the requirements.',
    link: './docs/insurance-requirements.html', linkText: 'Insurance requirements' },
  { id: 'emergency', title: 'Emergency contacts',
    keywords: ['emergency','fire','gas','flood','urgent','coned','edison','police','outage','leak','smell'],
    body: 'For a life-threatening emergency call 911. See building and utility emergency contacts.',
    link: './docs/emergency-contacts.html', linkText: 'Emergency contacts' },
  { id: 'meetings', title: 'Board meetings',
    keywords: ['meeting','meetings','board','agenda','schedule','annual','shareholders'],
    body: 'Upcoming board meetings are listed in the Meetings section.',
    link: '#meetings', linkText: 'See meetings' },
  { id: 'contact', title: 'Contact the board or managing agent',
    keywords: ['contact','board','email','reach','manager','managing','agent','gramatan','phone','call','superintendent','super'],
    body: 'Reach the board or managing agent in the Contact section.',
    link: '#contact', linkText: 'Go to Contact' },
  { id: 'documents', title: 'Building documents',
    keywords: ['documents','document','lease','bylaws','sublet','subletting','forms','library','proprietary','alteration'],
    body: 'Find building documents and guides in the Resources & Documents section.',
    link: '#documents', linkText: 'Open Documents' },
];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Build FAQ entries from the page DOM (question + answer text), so the assistant
// always reflects the live FAQ without duplicating its content here.
function faqEntries() {
  const out = [];
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-question');
    const a = item.querySelector('.faq-answer');
    if (!q || !a) return;
    const title = q.textContent.replace('▾', '').trim();
    out.push({ id: 'faq', title, body: a.textContent.trim(), answer: a.innerHTML, isFaq: true });
  });
  return out;
}

// Build entries from the live Building Updates feed, so the assistant covers
// recent notices automatically — it grows over time as the board posts updates,
// with no code changes needed.
function updateEntries() {
  const out = [];
  document.querySelectorAll('.update-card').forEach(card => {
    const h = card.querySelector('h4');
    const p = card.querySelector('p');
    if (!h) return;
    out.push({ id: 'update', title: h.textContent.trim(), body: p ? p.textContent.trim() : '', isUpdate: true });
  });
  return out;
}

export function initAssistant() {
  const btn = document.getElementById('assistant-toggle');
  const panel = document.getElementById('assistant-panel');
  const input = document.getElementById('assistant-input');
  const results = document.getElementById('assistant-results');
  const closeBtn = document.getElementById('assistant-close');
  if (!btn || !panel || !input || !results) return;

  const kb = () => [...faqEntries(), ...updateEntries(), ...ASSISTANT_TOPICS];
  const open = () => { panel.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); input.focus(); render(input.value); };
  const close = () => { panel.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };

  function render(query) {
    const q = (query || '').trim();
    if (!q) {
      results.innerHTML = '<p class="assistant-hint">Try: “how do I get a parking spot?”, “pay maintenance”, “house rules”, “report a leak”…</p>';
      return;
    }
    const hits = rankEntries(q, kb());
    if (!hits.length) {
      results.innerHTML = '<div class="assistant-result"><p>I couldn’t find that here. Reach the board in the <a href="#contact">Contact section</a>.</p></div>';
      return;
    }
    results.innerHTML = hits.map(h => {
      if (h.isFaq) {
        return `<div class="assistant-result"><span class="assistant-tag">FAQ</span><h5>${esc(h.title)}</h5><div class="assistant-answer">${h.answer}</div></div>`;
      }
      if (h.isUpdate) {
        const snippet = h.body.length > 180 ? h.body.slice(0, 180).trim() + '…' : h.body;
        return `<div class="assistant-result"><span class="assistant-tag">Update</span><h5>${esc(h.title)}</h5><p>${esc(snippet)}</p><a class="assistant-link" href="#updates">See in Updates →</a></div>`;
      }
      const link = h.action === 'maintenance'
        ? `<a class="assistant-link" href="#" onclick="if(window.openMaintWizard){openMaintWizard(event);}return false;">${esc(h.linkText)} →</a>`
        : `<a class="assistant-link" href="${esc(h.link)}">${esc(h.linkText)} →</a>`;
      return `<div class="assistant-result"><h5>${esc(h.title)}</h5><p>${esc(h.body)}</p>${link}</div>`;
    }).join('');
  }

  btn.addEventListener('click', () => panel.classList.contains('open') ? close() : open());
  if (closeBtn) closeBtn.addEventListener('click', close);
  input.addEventListener('input', () => render(input.value));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  // Close when a result link is followed (so the panel doesn't linger).
  results.addEventListener('click', e => { if (e.target.closest('a')) close(); });
}
