# Job Application Tracker — Browser Extension

## Project reference

This file is the source of truth for this project. Read it before writing any code or making any architectural decision. If a requirement here conflicts with something else, this file wins unless explicitly updated.

---

## 1. Problem statement

Job seekers who apply broadly — daily, across 10+ platforms (LinkedIn, Indeed, company career pages, etc.) — lose track of their own applications. Two specific failure points repeat constantly:

1. **At apply time**: there is no fast, frictionless way to log "I just applied to X" without breaking flow to open a spreadsheet.
2. **At response time**: weeks later, an email arrives (interview invite or rejection). The user often can't remember when, where, or even whether they applied to that company, and has no fast way to find the original record and update its status.

Existing tools (Teal, Huntr, Simplify, JobCopilot, various Notion-sync extensions) solve the first problem reasonably well. **None of them solve the second problem** — matching an incoming response back to an existing application record and updating it. This is the core differentiator of this project.

---

## 2. Product principles (non-negotiable)

- **Decentralized by design.** There is no backend server and no centralized database owned by the developer. Each user's data lives entirely in their own Google account (Google Sheets). The extension is a client that reads/writes to that Sheet directly.
- **Manual-first, AI-optional.** Every feature must work completely with manual input alone. AI is an additive convenience layer on top of manual flows, never a requirement to use the product. This applies to the whole v1: **AI features are dropped for the initial build and will be added in a later phase.**
- **No magic.** When AI is reintroduced later, it must not behave as a black box. AI-assisted actions (e.g. matching a screenshot to a row) use the exact same underlying logic as the manual equivalent (e.g. search by company/role) — AI only supplies the search input, it doesn't have special privileged behavior. A failed AI match looks identical to a manual search with zero results.
- **No invented data.** The system never fabricates information. If a value isn't known or provided by the user, it stays empty. This applies in particular to the interview date field, which is always entered manually by the user, never inferred or guessed.

---

## 3. Scope for this build (v1)

### In scope

- Browser extension (Manifest V3, Chrome-compatible).
- Google OAuth login (via Chrome `identity` API) to connect to the user's own Google account.
- Google Sheets as the sole data store. The extension creates/uses a Sheet in the user's own Drive.
- Three interfaces: **Dashboard**, **Applying**, **Response tracking**.
- All data entry and updates are manual (forms, dropdowns, search/filter, click-to-edit).

### Explicitly out of scope for this build

- Any AI feature (screenshot-to-fields extraction, AI-assisted search/matching, agent-style staged UI). To be designed and added in a later phase.
- Any backend server, API, or centralized database.
- Calendar integration / automatic reminders (was discussed, deferred — see "Future phases").
- Notion or any storage backend other than Google Sheets.
- Auto-apply / autofill of job application forms (not the goal of this product — this is a tracker, not an applier).

### Future phases (not built now, but architecture should not block them later)

- AI-assisted "apply" entry: screenshot a job posting → Puter.js AI pre-fills the manual form fields → user reviews in a multi-step flow → user confirms.
- AI-assisted "response" entry: screenshot a response email → Puter.js AI extracts company/role → runs the same manual search → user reviews the match and the status change.
- Multi-step post-AI UX flow: Review & AI Fields -> Fill Missing Fields -> Add Notes (with "Don't show again" option).
- AI calls, when added, will use **Puter.js** (`puter.ai.chat`), adhering to its user-pays model. No backend is introduced; calls go directly from the extension to the Puter cloud using the user's free Puter account.
- Optional calendar event creation when an application status changes to "Interview."

---

## 4. Interfaces (v1 — Manual Path A)

The extension uses a **Dual-Path Architecture**. Path A is the primary manual flow built in v1. Path B (AI Screenshot Assist) is reserved for future phases.

### Path A: The Normal Path (Slide-out Extension)

Triggered by clicking the extension icon in the Chrome toolbar. A responsive slide-out panel appears from the right side of the screen, containing:

#### 4.1 Dashboard

- Total number of applications.
- Breakdown of applications by platform (LinkedIn, Indeed, company site, etc.) — e.g. a simple count or chart of most-used platforms.
- Last 5 applications, shown inline.
- "View all" action opens the full applications table, sourced live from the connected Google Sheet.

#### 4.2 Applying

- Manual form to log a new application with fields: role, company, job posting link, company link, platform, date applied, status (defaults to "Applied").
- Submitting the form appends a new row to the Google Sheet.

#### 4.3 Response tracking

- Search/filter box to find an existing application by company or role.
- User selects a row from the filtered results.
- User manually changes the status via a dropdown (e.g. Applied → Interview, Applied → Rejected, Interview → Offer, etc.).
- If the new status is "Interview," an additional date field appears for the user to manually enter the interview date.
- No match found for a search simply shows an empty result state — this is expected, normal behavior, not an error.

### Path B: The Enhanced UX Path (Future Phase)

- Triggered by clicking the camera/capture icon located within the slide-out panel's "New Application" or "Response" views.
- Transitions into a 4-step AI review flow (Intent Picker → Review Fields → Fill Missing → Notes).
- (Reserved visually in v1 UI, but functionality deferred to Phase 2.)

---

## 5. Data model

Single Google Sheet, single primary worksheet ("Applications" or similar).

| Priority | Column | Type | Notes |
| --- | --- | --- | --- |
| Required | `id` | string | Stable unique identifier for the row (e.g. UUID or row timestamp) |
| Required | `role` | string | Job title |
| **Required** | `company` | string | **Primary key for matching** — Company name (never empty) |
| Required | `platform` | string | LinkedIn, Indeed, company site, etc. (controlled list recommended) |
| Optional | `job_link` | string | URL to the job posting |
| **Optional** | `company_link` | string | LinkedIn company page or official site URL |
| Required | `date_applied` | date | ISO format recommended (YYYY-MM-DD) |
| Required | `status` | string | Applied / Interview / Rejected / Offer / Withdrawn (controlled list) |
| Conditional | `interview_date` | date | Only populated if status = Interview; manually entered |
| Optional | `notes` | string | Optional free text |

This schema should be finalized and treated as a contract — the dashboard, applying form, and response search all depend on consistent column names and status values. `company` is the critical matching key for Response Tracking.

---

## 6. Architecture

- **No backend.** The extension talks directly to the Google Sheets API. Authentication is handled client-side via Chrome's `identity` API (OAuth 2.0).
- **Storage:** Google Sheets only, in the user's own Google account. No data is ever sent to or stored by the developer.
- **Client-only logic:** all search, filter, and status-update logic runs inside the extension itself, operating on data fetched from the Sheet.
- **AI Compatibility:** This architecture remains completely backend-free by design. Future AI capabilities will be integrated via **Puter.js** using its user-pays model. The extension will bundle `@heyputer/puter.js` and users will authenticate with their own Puter account to execute AI extraction directly from the client.

---

## 7. Competitive context (for reference, not action)

Validated via research before committing to this build:

- **Apply-side logging to Sheets/Notion** is already solved by multiple existing tools and extensions. This is not a differentiator on its own.
- **Response-side matching** (taking a reply and finding/updating the original application record) is not solved by any tool found during research. This is the project's real point of differentiation and should guide prioritization whenever scope tradeoffs come up.
