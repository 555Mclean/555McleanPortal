# Public Documents Folder

PDFs placed here are served directly from GitHub Pages and are **publicly accessible** to anyone with the URL. Only commit documents that are appropriate for public viewing.

## Documents that belong here

| File name | Card in portal | Notes |
|---|---|---|
| `house-rules.pdf` | House Rules | OK to be public |
| `move-policy.pdf` | Move Policy | OK to be public |
| `insurance-requirements.pdf` | Insurance Requirements | OK to be public |

## Documents that do NOT belong here

The following contain sensitive or personal information and must stay in the **private Google Drive folder** instead:

- Proprietary Lease
- Bylaws
- Sublet Application
- Alteration Agreement

## How to publish a PDF

1. Add the PDF to this folder (e.g. `docs/house-rules.pdf`)
2. In `index.html`, find the matching `<div class="doc-card fade-in">` and:
   - Change the opening tag from `<div` to `<a`
   - Add `href="./docs/house-rules.pdf"` and `download` attributes
   - Change the closing tag from `</div>` to `</a>`
   - Replace the `<span class="doc-coming">⏳ Coming Soon</span>` line with `<span class="doc-coming">⬇ Download PDF</span>`
3. Commit both the PDF and the updated `index.html` to `main`

### Example — before:
```html
<div class="doc-card fade-in">
  <span class="doc-card-icon">📋</span>
  <h4>House Rules</h4>
  <p>The building's governing house rules...</p>
  <span class="doc-coming">⏳ Coming Soon</span>
</div>
```

### Example — after:
```html
<a class="doc-card fade-in" href="./docs/house-rules.pdf" download>
  <span class="doc-card-icon">📋</span>
  <h4>House Rules</h4>
  <p>The building's governing house rules...</p>
  <span class="doc-coming">⬇ Download PDF</span>
</a>
```

## Google Drive folder

The shareholder-only folder URL needs to be updated in `index.html` once the board creates the shared Drive folder. Search for the comment `TODO: Replace href` in `index.html`.
