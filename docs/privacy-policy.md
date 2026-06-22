# Privacy Policy

**Candidex — Job Application Tracker**
*Last updated: June 22, 2026*

## Summary

Candidex is a Chrome extension that helps you track job applications using your own Google Sheet. **We do not collect, store, or transmit any of your data.** Your information stays entirely within your Google account.

---

## What data Candidex accesses

| Data | Purpose | Where it's stored |
| ---- | ------- | ----------------- |
| Google account identity | Authenticate you via Google OAuth so the extension can read/write your Sheet | Managed by Chrome's built-in `identity` API; no credentials are stored by the extension |
| Google Sheets data | Read and write job application entries (role, company, status, etc.) | In a single Google Sheet in **your own** Google Drive |
| Extension preferences | Remember your connected spreadsheet ID | `chrome.storage.local` on your device only |

## What data Candidex does NOT access

- We do **not** read your browsing history.
- We do **not** access any Google Drive files other than the single Sheet the extension creates.
- We do **not** collect analytics, telemetry, or usage metrics.
- We do **not** use cookies or tracking pixels.
- We do **not** sell, share, or transfer any data to third parties.

## Permissions explained

| Permission | Why it's needed |
| ---------- | --------------- |
| `identity` | Sign in with your Google account to access Google Sheets API |
| `storage` | Save your spreadsheet ID locally so you don't have to reconnect each time |
| `activeTab` | Allow the slide-out panel to appear on the current page |
| `scripting` | Inject the extension's UI panel into the active tab |

## OAuth scope

Candidex requests the **`drive.file`** scope only. This limits access exclusively to files that Candidex itself creates. The extension **cannot** see, read, or modify any other file in your Google Drive.

## Data storage & security

- **No backend server.** Candidex has no server, no database, and no API of its own. All communication happens directly between the extension running in your browser and the Google Sheets API.
- **No data leaves your device** except for Google Sheets API calls made under your own authenticated session.
- **Open source.** The full source code is available at [github.com/sebai-dhia/candidex](https://github.com/sebai-dhia/candidex) for inspection.

## Third-party services

The only third-party service Candidex communicates with is the **Google Sheets API** (`sheets.googleapis.com`), using your own OAuth token. No other external services are contacted.

## Children's privacy

Candidex is not directed at children under 13 and does not knowingly collect information from children.

## Changes to this policy

If this policy is updated, the changes will be posted on this page with an updated "Last updated" date. Since Candidex collects no data, meaningful changes are unlikely.

## Contact

If you have questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/sebai-dhia/candidex/issues).
