# 555 McLean Ave Portal — Board To-Do List

Items below are needed to complete the portal. The site structure is ready;
the board just needs to supply the information.

---

## 🔴 Urgent — Replace Before Going Live

- [ ] **Board email** — replace every `board@example.com` with the real board address
- [ ] **Managing agent email** — replace `info@example.com` with the agent's real address
- [ ] **Managing agent name** — replace "Name & contact to be confirmed" in the Contact section
- [ ] **Emergency phone number** — replace `(914) 555-0000` with the real building emergency number
- [ ] Remove the "early version" notice from the footer and Contact section once the above are done

---

## 📄 Documents Section — Upload PDFs When Available

The Documents section is live on the site with placeholder cards.
To publish a document, open `index.html`, find the matching `.doc-card` div,
and replace the `<div class="doc-card">` with:

```html
<a href="PATH-TO-PDF.pdf" class="doc-card fade-in" target="_blank" rel="noopener">
  <span class="doc-card-icon">📋</span>
  <h4>Document Title</h4>
  <p>Short description.</p>
  <span class="res-link">Download PDF →</span>
</a>
```

Documents needed:
- [x] House Rules — published as `docs/house-rules.html`
- [x] Move-In / Move-Out Policy — published as `docs/move-policy.html`
- [x] Insurance Requirements — published as `docs/insurance-requirements.html`
- [ ] Proprietary Lease (PDF) — private Google Drive folder
- [ ] Bylaws / Certificate of Incorporation (PDF) — private Google Drive folder
- [ ] Sublet Application (PDF form) — private Google Drive folder
- [ ] Alteration Agreement (PDF) — private Google Drive folder

> Note: the three published documents above use the Board's recommended
> figures (deposits, fines, $300,000 HO-6 minimum). Confirm them against the
> Proprietary Lease and add the co-op's exact legal name to the insurance page.

---

## 🚗 Waitlist Automation — Optional Board Setup

The parking & storage queues can now **update themselves** from a Google Form,
so you no longer have to hand-edit `data/waitlist.json` for every sign-up.
Full step-by-step guide: **`docs/waitlist-automation.html`**.

Quick version:
- [ ] Create a Google Form (Which list? · Apartment # · Name · Email · Phone · parking preferences · optional Status)
- [ ] Link it to a responses Sheet, then **File → Share → Publish to web → CSV**
- [ ] Add the CSV link as repo secret **`WAITLIST_CSV_URL`** (Settings → Secrets and variables → Actions)
- [ ] (Recommended) Fill in `WL_SUBMIT` in `main.js` with the form's `entry.*` ids so the site's own form feeds the sheet
- [ ] Mark a resident's **Status** cell `assigned` (or delete the row) to drop them from the public queue

> Until configured, sign-ups fall back to a pre-filled email and the queue shows
> whatever is in `data/waitlist.json` — nothing breaks.

---

## 📋 Future Sections to Add (when info is available)

- [ ] **Financial transparency** — annual budget summary, reserve fund status, or a note directing shareholders to request financials
- [x] **Building amenities & policies** — folded into `docs/house-rules.html` (Laundry, Packages) to keep the Resources section uncluttered; standalone `docs/amenities.html` retired
- [x] **Extended emergency contacts** — published as `docs/emergency-contacts.html` (confirm building-specific numbers)
- [x] **ClickPay onboarding info** — published as `docs/clickpay-guide.html`

> The three pages above ship with sensible defaults; the board should confirm
> the items marked "to be confirmed" (hours, super's number, building emergency
> line) before treating them as official.

---

## ✅ Already Done

- Portal live on GitHub Pages
- Election banner + real-time countdown (auto-clears after June 8)
- Board meetings schedule (edit `data/meetings.json`)
- Building updates / news feed (edit `data/updates.json`)
- Parking & storage waitlists — interactive forms + queues, with optional self-updating sync from a Google Form (see `docs/waitlist-automation.html`)
- Notice bar system (activate via `data/notices.json`)
- FAQ accordion (8 questions)
- Dark mode, back-to-top, copy address, FAQ search
- ClickPay maintenance payment link (Quick Actions + Resources)
- Documents section (structure ready, PDFs pending)
- Maintenance Request form — optional auto-capture (`MAINT_SUBMIT`) with email fallback
- Resident info pages — Emergency Contacts, ClickPay Setup Guide (amenities folded into House Rules)
- Installable PWA — works offline; assets are version-stamped so updates always reach visitors
- Automated CI — tests run on every push, deploys to GitHub Pages automatically
