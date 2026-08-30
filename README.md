# <img src="public/candidex_logo.png" alt="Candidex logo" width="36" align="left" /> Candidex

An open-source browser extension for tracking job applications without giving your data to another hiring platform.

Candidex opens as a slide-out panel on top of the page you are browsing, lets you save applications in seconds, and keeps everything in your own Google Sheet.

![Candidex in use on a job search page](landing/images/promotional.png)

## Why Candidex?

Job searching gets messy fast. You apply from LinkedIn, company career pages, job boards, newsletters, and random tabs you swear you will remember later.

Candidex gives you one lightweight place to track it all:

- Log applications without leaving the job page.
- See your application stats at a glance.
- Search old applications when a company finally replies.
- Update statuses like Applied, Interview, Offer, Rejected, or Withdrawn.
- Keep ownership of your data in your own Google Drive.

No backend. No hosted database. No account on a third-party job tracker.

## Features

- **Slide-out panel** - Use Candidex directly on top of job search pages.
- **Dashboard** - View totals, response rate, success rate, platforms, countries, work types, and recent applications.
- **New application form** - Save company, role, platform, links, country, work type, date, status, and notes.
- **Response tracking** - Search by company or role, then update status and interview date.
- **Google Sheets storage** - Your applications live in a Sheet created in your own Google Drive.
- **Open source** - The project is inspectable, forkable, and contribution-friendly.

## Browser Support

Candidex is built as a Chromium Manifest V3 extension.

| Browser | Status |
| --- | --- |
| Chrome | Supported |
| Opera | Supported |
| Edge / Brave / Vivaldi | Supported, lightly tested |
| Firefox | Future investigation |

Google sign-in adapts to the browser: Chrome uses the native `chrome.identity.getAuthToken` flow, while Opera, Edge, Brave, and Vivaldi fall back to `launchWebAuthFlow`. Both paths are implemented and shipped. Coverage on the less-tested browsers will improve as contributors report results.

## Privacy

Candidex is built around a simple rule: your job search data should belong to you.

- Your applications are stored in your own Google Sheet (same Google account can access them from another browser).
- AI API keys stay on the browser where you connect them — never in Sheets. Optional session-only mode clears the key when the browser closes.
- Candidex does not run a backend server.
- Candidex does not collect analytics or telemetry.
- Candidex does not use cookies or tracking pixels.
- Google OAuth runs through the browser extension identity flow.
- The OAuth `client_id` in `src/manifest.json` is public by design; there is no `client_secret`.

Read the full policy in `docs/privacy-policy.md`.

## Install From Source

Packaged store releases are not available yet. For now, you can install Candidex from source.

### Prerequisites

- Node.js 22.22.3+ (see `.nvmrc`)
- npm 10+
- Chrome, Opera, or another Chromium-based browser

### Build

```bash
git clone https://github.com/sebai-dhia/candidex.git
cd candidex
npm install
npm run build
```

### Load the Extension

1. Open your browser's extensions page: `chrome://extensions` in Chrome, Edge, Brave, or Vivaldi, and `opera://extensions` in Opera.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `dist/candidex/browser`.
5. Pin or open Candidex from the browser toolbar.

## For Contributors

Candidex is a small Angular extension project. Contributions are welcome, especially around browser compatibility, privacy-safe UX improvements, accessibility, and extension packaging.

### Development

```bash
npm run watch
```

After each rebuild, refresh the unpacked extension from your browser's extensions page.

When editing files under `src/extension/`, run `npm run build:extension` (or a full `npm run build`) before reloading the extension.

### Scripts

```bash
npm run start          # Start Angular dev server
npm run build          # Build Angular app + extension scripts
npm run build:extension # Build background.js and content.js only
npm run watch          # Rebuild Angular app on file changes
npm run watch:extension # Rebuild extension scripts on file changes
npm test               # Run unit tests
npm run package        # Build and create extension zip
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Angular 22, signals, zoneless change detection |
| Extension | Chromium Manifest V3 |
| Storage | Google Sheets API v4 |
| Auth | Browser identity API + Google OAuth |
| Styling | Tailwind CSS 3 + SCSS |
| Icons | Lucide Angular |
| Typography | Inter, Plus Jakarta Sans |

### Project Structure

```txt
src/
|-- manifest.json              # Extension manifest
|-- extension/                 # Extension scripts (built with esbuild)
|   |-- background/            # Service worker modules
|   |-- content/
|   |   |-- overlay/           # Slide-out iframe panel
|   |   |-- capture/           # AI region select, review card, styles
|   |   |-- extraction/        # AI fallback chain
|   |   `-- messaging/         # Runtime + postMessage bridge
|   `-- shared/                # Shared prompts and message constants
|-- app/
|   |-- app.ts                 # Root component
|   |-- core/
|   |   |-- constants/         # Shared option and country constants
|   |   |-- repositories/      # Application data access
|   |   |-- services/          # Auth, Google Sheets, extension bridge, AI capture
|   |   `-- utils/             # Shared mapping helpers
|   `-- features/
|       |-- application/       # New application form
|       |-- dashboard/         # Dashboard view
|       `-- tracking/          # Response tracking view
`-- styles.scss                # Global styles
```

## Security Notes

- No source secrets are required.
- The extension requests only the permissions needed for auth, storage, active tab access, and UI injection.
- JavaScript runs from the extension bundle; no remote code is loaded.
- Application data stays in the user's Google account.
- AI keys and OAuth tokens use browser storage only (`chrome.storage.local` / `chrome.storage.session`), not Google Sheets.
- For **paid** providers (Claude, OpenAI, DeepSeek): use a **dedicated key** with a **spend limit** in the provider console — not your main production key.

## Roadmap

- Improve packaged release flow.
- Broaden test coverage on Edge, Brave, and Vivaldi.
- Investigate Firefox support.
- Improve accessibility and keyboard navigation.
- Add optional browser-store screenshots and documentation.

## License

[MIT](LICENSE)