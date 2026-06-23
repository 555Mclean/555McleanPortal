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

## 📋 Future Sections to Add (when info is available)

- [ ] **Payment info** — ClickPay is linked; if there's an account setup guide or support contact, add it to the Resources section
- [ ] **Financial transparency** — annual budget summary, reserve fund status, or a note directing shareholders to request financials
- [ ] **Building amenities & policies** — laundry hours/location, package handling, recycling/trash schedule, super's hours, guest policy, quiet hours
- [ ] **Extended emergency contacts** — super's name and direct number, Con Ed gas/electric emergency lines, local non-emergency police (46th Precinct)
- [ ] **ClickPay onboarding info** — step-by-step instructions for shareholders registering with ClickPay for the first time

---

## ✅ Already Done

- Portal live on GitHub Pages
- Election banner + real-time countdown (auto-clears after June 8)
- Board meetings schedule (edit `data/meetings.json`)
- Building updates / news feed (edit `data/updates.json`)
- Parking & storage waitlists (edit `data/waitlist.json`)
- Newsletter sign-up
- Notice bar system (activate via `data/notices.json`)
- FAQ accordion (8 questions)
- Dark mode, back-to-top, copy address, FAQ search
- ClickPay maintenance payment link (Quick Actions + Resources)
- Documents section (structure ready, PDFs pending)
- Automated CI — tests run on every push, deploys to GitHub Pages automatically
