# Contributing to Candidex

Thanks for helping improve Candidex. This project has two build surfaces:

- **Angular app** — the extension popup/panel UI under `src/app/`
- **Extension scripts** — background + content scripts under `src/extension/`

## Prerequisites

- Node.js 22.22.3+ (see `.nvmrc`)
- npm 10+
- A Chromium-based browser (Chrome or Opera; both auth paths are exercised there)

## Setup

```bash
npm install
```

## Development

### Full build

```bash
npm run build
```

This builds extension scripts into `.generated/extension/` first, then the Angular app copies them (plus static assets from `public/`) into `dist/candidex/browser/` along with `manifest.json`.

Do **not** run `ng build` alone — it will copy a manifest that references `background.js` without generating that file first.

### Angular-only watch

```bash
npm run watch
```

Rebuilds the Angular app on file changes. Reload the unpacked extension after each rebuild.

### Extension-only watch

```bash
npm run watch:extension
```

Rebuilds `background.js` and `content.js` when files under `src/extension/` change. Reload the extension from your browser after each rebuild.

### Tests

```bash
npm test
```

Runs Vitest unit tests for pure helpers in the Angular and extension layers.

## Load the extension

1. Run `npm run build`
2. Open your browser extensions page
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select `dist/candidex/browser`

## Project conventions

- Extension message actions live in `src/extension/shared/messages.json` and are imported by both the extension scripts and the Angular app.
- Application data access should go through `ApplicationRepository`, not directly through `GoogleSheets`.
- Keep generated build output out of `src/` and `public/` — extension bundles are written to `.generated/extension/` and copied into `dist/candidex/browser/`.
- `public/` is for static assets only (images).
- The AI capture overlay uses system fonts only (no external CDN requests from the content script).
- Landing page images live in `landing/images/` (not `public/`). When updating the privacy policy, keep `docs/privacy-policy.md` and `docs/privacy-policy.html` in sync.

## Pull requests

- Ensure `npm run build` and `npm test` pass locally before opening a PR.
- CI runs the same build and test steps on pull requests to `main`.