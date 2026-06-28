# Public Documents Folder

Files placed here are served directly from GitHub Pages and are **publicly accessible** to anyone with the URL. Only commit documents that are appropriate for public viewing.

## Published documents (live)

These three documents are published as **HTML pages** in this folder and are the single source of truth — to change their wording, edit the matching `.html` file directly (the text lives in plain `<li>`/`<p>` tags). The "Read →" cards in the portal's Resources &amp; Documents section link to them.

| File | Card in portal | Notes |
|---|---|---|
| `house-rules.html` | House Rules | Live · OK to be public |
| `move-policy.html` | Move Policy | Live · OK to be public |
| `insurance-requirements.html` | Insurance Requirements | Live · OK to be public |

All figures in these pages (deposits, fines, the $300,000 HO-6 minimum, etc.) are the Board's recommended values — adjust against the Proprietary Lease, which controls on any conflict.

## Adding a downloadable PDF instead

If you ever prefer a PDF for one of these (or a new document), drop the PDF in this folder and point the card's `href` at it (see "How to publish a PDF" below).

## Documents that do NOT belong here

The following contain sensitive or personal information and must stay in the **private Google Drive folder** instead:

- Proprietary Lease
- Bylaws
- Sublet Application
- Alteration Agreement

## How to publish a document

Each item in the Documents list is a row link. To add or update one:

1. Add the file to this folder (e.g. `docs/house-rules.html` or `docs/house-rules.pdf`)
2. In `index.html`, find the matching `<a class="doc-row fade-in">` row and point its `href` at the file
3. Update the title (`doc-row-title`) and the one-line hint (`doc-row-hint`) if needed
4. Commit both the document and the updated `index.html` to `main`

### Example row
```html
<a class="doc-row fade-in" href="./docs/house-rules.html">
  <span class="doc-row-icon" aria-hidden="true">📋</span>
  <span class="doc-row-main">
    <span class="doc-row-title">House Rules</span>
    <span class="doc-row-hint">Noise, moves, guests &amp; common-area rules</span>
  </span>
  <span class="doc-row-arrow" aria-hidden="true">→</span>
</a>
```

## Google Drive folder

The shareholder-only folder URL needs to be updated in `index.html` once the board creates the shared Drive folder. Search for the comment `TODO: Replace href` in `index.html`.
