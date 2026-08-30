# Privacy Policy

**Candidex — Job Application Tracker**
*Last updated: August 28, 2026*

## Summary

Candidex is a browser extension that helps you track job applications using **your own Google Sheet** and, optionally, a **personal AI provider** you connect yourself. Candidex has no backend server of its own. Data stays under your control in your Google account, your chosen AI provider, and local browser storage.

---

## What data Candidex accesses

| Data | Purpose | Where it's stored / sent |
| ---- | ------- | ------------------------ |
| Google account identity | Authenticate via Google OAuth so the extension can read/write your Sheet | Chrome `identity` API; OAuth access tokens are cached in `chrome.storage.session` for the current browser session |
| Google Sheets data | Read and write job application entries (role, company, status, etc.) | A single Google Sheet in **your** Google Drive — synced via your Google account across devices |
| Selected page text / job posting snippets | Optional AI-assisted capture to extract role, company, location, and work type | Sent only to the **AI provider you configure** (for example Groq, OpenRouter, Gemini, DeepSeek, Anthropic, or OpenAI) |
| Provider API keys | Authenticate your personal AI Engine | `chrome.storage.local` or `chrome.storage.session` on your device only — **never** in Google Sheets |
| Extension preferences | Spreadsheet ID, locale, setup status, cached sheet rows | `chrome.storage.local` on your device only (per browser install) |

## What data Candidex does NOT access

- We do **not** store API keys in Google Sheets.
- We do **not** read your full browsing history.
- We do **not** access Google Drive files other than the Sheet Candidex creates or that you reconnect.
- We do **not** collect analytics, telemetry, or usage metrics.
- We do **not** use cookies or tracking pixels.
- We do **not** operate a Candidex cloud database that stores your applications.

## Permissions explained

| Permission | Why it's needed |
| ---------- | --------------- |
| `identity` | Sign in with your Google account to access Google Sheets / Drive file APIs |
| `storage` | Save spreadsheet ID, locale, setup status, and AI Engine settings locally |
| `activeTab` / `tabs` | Open the slide-out panel and capture context from the active tab |
| `scripting` | Inject the extension UI and capture overlay into the active tab |
| Host permissions for AI providers | Call the provider APIs **you** enable for extraction / key verification |

## OAuth scope

Candidex requests the **`drive.file`** scope only. This limits access to files that Candidex creates or that the user opens with the extension. The extension cannot browse your entire Drive.

## AI-assisted capture

When you use AI Capture:

1. You select a region (or allow extraction from page text / structured data).
2. Selected text may be sent to your configured provider over HTTPS.
3. Returned fields are shown in a review card for you to edit before saving.
4. Saving writes to **your** Google Sheet.

If AI fails or is unavailable, Candidex may fall back to local regex / JSON-LD extraction on the page without contacting a provider.

You can disconnect your AI provider at any time; that removes the stored API key from extension storage. You can also choose **session-only** key storage when connecting a provider — the key is cleared when you close the browser.

## Paid API keys (Claude, OpenAI, DeepSeek, etc.)

If you connect a **paid** provider:

- Create a **dedicated API key for Candidex** — do not use your main production key.
- Set a **monthly spend limit** in your provider console ([Anthropic](https://console.anthropic.com/settings/keys), [OpenAI](https://platform.openai.com/api-keys), etc.).
- Prefer **session-only** storage on shared or work computers.
- **Revoke and rotate** the key if you suspect your machine or browser profile was compromised.

Candidex stores keys in your browser only and blocks job websites from reading them, but **cannot guarantee protection** against malware, stolen devices, or anyone with access to your Chrome profile. Provider spend limits are your strongest financial safeguard.

## Cross-browser and multi-device use

- **Application rows** sync through your Google Sheet when you use the same Google account on another device or browser.
- **API keys, locale, setup status, and cached sheet rows** stay on each browser install and are not synced by Candidex.
- **Sign out completely** clears both your Google session and stored AI key on that install.

## Data storage & security

- **No Candidex backend.** There is no Candidex server that receives your sheet rows or API keys.
- **Google Sheets** traffic uses your OAuth session with Google.
- **AI provider** traffic uses the API key you supply and only goes to that provider.
- **API keys** are kept in trusted extension contexts only (Angular panel and service worker). Content scripts on web pages cannot read them.
- **Local storage** holds configuration and short-lived caches; clearing extension data removes them.
- **Open source.** Source is available at [github.com/sebai-dhia/candidex](https://github.com/sebai-dhia/candidex).

## Third-party services

Depending on which features you use, Candidex may communicate with:

- **Google Sheets / Drive APIs** (`sheets.googleapis.com`, `googleapis.com`)
- **Your configured AI provider(s)** among the supported catalog (for example `api.groq.com`, `openrouter.ai`, `generativelanguage.googleapis.com`, `api.deepseek.com`, `api.anthropic.com`, `api.openai.com`)

No other analytics or advertising services are contacted by Candidex.

## Retention & deletion

- Application rows live in your Google Sheet until you delete them (in Candidex or in Sheets).
- Local extension data can be removed by clearing the extension’s storage or uninstalling Candidex.
- AI providers retain data according to **their** policies; review the provider you choose.

## Children's privacy

Candidex is not directed at children under 13 and does not knowingly collect information from children.

## Changes to this policy

If this policy is updated, the changes will be posted on this page with an updated "Last updated" date.

## Contact

If you have questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/sebai-dhia/candidex/issues).
