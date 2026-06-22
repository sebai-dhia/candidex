# Candidex

A Chrome extension that helps job seekers track applications and match responses — powered by your own Google Sheet.

## What it does

Candidex gives you a slide-out panel in Chrome with three views:

- **Dashboard** — see your total applications, breakdown by platform, and recent entries at a glance.
- **Apply** — log a new job application in seconds without leaving the page you're on.
- **Track responses** — search your existing applications by company or role, then update the status (Interview, Rejected, Offer, etc.) when you hear back.

All your data lives in a Google Sheet in **your own Google Drive**. There is no backend server and no developer-owned database — Candidex is just a client that reads and writes to your Sheet.

## Authentication

Candidex uses Chrome's built-in [`chrome.identity`](https://developer.chrome.com/docs/extensions/reference/api/identity) API to obtain an OAuth 2.0 token from Google.

- The **`client_id`** in `src/manifest.json` is a public identifier — it tells Google which app is requesting access. It is not a secret and is safe to publish.
- There is **no `client_secret`** anywhere in this project. Chrome extensions use the "installed application" OAuth flow which does not require one.
- The only OAuth scope requested is **`drive.file`** — this limits access to files that the extension itself creates. Candidex cannot read or modify any other file in your Drive.
- Tokens are obtained at runtime and cached in memory. They are never written to source files or committed to the repository.

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| Framework | Angular 22 (zoneless, standalone components, signals) |
| Extension | Chrome Manifest V3 |
| Storage | Google Sheets API v4 (user's own account) |
| Styling | Tailwind CSS 3 + custom SCSS |
| Icons | Lucide Angular |
| Typography | Inter, Plus Jakarta Sans |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm 10+
- Google Chrome

### Install & build

```bash
git clone https://github.com/sebai-dhia/candidex.git
cd candidex
npm install
npm run build
```

### Load the extension locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `dist/candidex/browser` folder.
4. Click the Candidex icon in your toolbar to open the panel.

### Development

```bash
npm run watch          # rebuild on file changes
```

After each rebuild, go to `chrome://extensions` and click the refresh icon on the Candidex card.

## Project structure

```
src/
├── manifest.json              # Chrome extension manifest (MV3)
├── background.js              # Service worker
├── content.js                 # Content script (slide-out panel injection)
├── app/
│   ├── app.ts                 # Root component (auth gate + navigation)
│   ├── core/services/
│   │   ├── auth.ts            # Chrome identity OAuth wrapper
│   │   └── google-sheets.ts   # Google Sheets API client
│   └── features/
│       ├── dashboard/         # Dashboard view
│       ├── application/       # "Apply" form view
│       └── tracking/          # Response tracking view
└── styles.scss                # Global styles
```

## Security

- **No secrets in source.** The only credential-related value is the OAuth `client_id`, which is public by design.
- **Minimal permissions.** The extension requests only `scripting`, `identity`, `storage`, and `activeTab`.
- **CSP enforced.** The manifest sets a strict Content Security Policy (`script-src 'self'; object-src 'self'`).
- **No remote code.** All JavaScript runs from the extension bundle — no external script loading.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes (`git commit -m "Add my feature"`).
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a Pull Request.

Please keep PRs focused on a single change. For larger features, open an issue first to discuss the approach.

## License

[MIT](LICENSE)
