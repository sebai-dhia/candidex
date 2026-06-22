# Candidex — Full Project Context (Conversation Export)

> **Purpose:** This document captures every architectural decision, design choice, and implementation detail established during the initial design conversation. Reference this file at the start of any new conversation to restore full context.

---

## 1. What is Candidex?

A **Chrome Extension** (Manifest V3) that helps job seekers track their applications using **Google Sheets** as the sole data store. The core differentiator is **Response Tracking** — matching an incoming email response (interview invite or rejection) back to an existing application record.

**Two critical problems solved:**
1. **At apply time:** Frictionless logging without breaking flow.
2. **At response time:** Finding and updating the original application when a response arrives weeks later.

---

## 2. Non-Negotiable Principles

- **No backend.** Extension talks directly to Google Sheets API. No developer-owned server or database.
- **Manual-first, AI-optional.** Every feature works with manual input alone. AI is additive convenience, never required.
- **No magic.** AI uses the same form fields and logic as manual entry.
- **No invented data.** If a value isn't known, it stays empty. Never inferred or guessed.
- **Decentralized.** Each user's data lives in their own Google account.

---

## 3. Dual-Path UX Architecture

### Path A: The Normal Path (v1 — Built Now)
- Triggered by clicking the extension icon in Chrome toolbar.
- Opens a **responsive slide-out panel** from the right side.
- Contains: **Dashboard**, **New Application** (manual form), **Track Response** (search & update).

### Path B: The Enhanced UX Path (Future Phase 2)
- Triggered by clicking a **camera/capture icon** within the slide-out panel.
- Uses **Puter.js** (`puter.ai.chat()`) for screenshot-to-data extraction.
- Follows a 4-step flow: Intent Picker → Review AI Fields → Fill Missing → Notes.
- Camera icon is **visible but disabled** in v1 with a "Coming Soon" tooltip.

---

## 4. Technology Stack

| Category | Technology | Rationale |
|---|---|---|
| **Framework** | Angular 18+ (Zoneless, Signals) | User's strongest framework. DI perfect for services. Signals for fine-grained reactivity. |
| **Bundler** | Angular CLI | Configured with `outputHashing: none` for Chrome Extension compatibility. |
| **Styling** | Tailwind CSS v3/v4 | Utility-first, consistent design system. |
| **Icons** | Lucide Angular | Clean, professional SVG icons. |
| **Data & Auth** | Google Sheets API v4 + Chrome `identity` API | Direct client-to-Sheets, no backend. |
| **AI (Phase 2)** | Puter.js (`@heyputer/puter.js` via NPM) | User-pays model, no API keys in code, no backend needed. |

---

## 5. Brand Identity

- **Name:** Candidex
- **Tagline:** "Track Applications. Land Opportunities."
- **Typography:**
  - Headings: `Plus Jakarta Sans`
  - Body/UI: `Inter`
- **Color Palette:**
  - Primary: **Indigo** (`#6366F1` / `bg-indigo-600`)
  - Accent (AI): **Amber** (`#F59E0B` / `bg-amber-100`)
  - Neutrals: **Slate** (backgrounds, text)
  - Status Tags: Emerald (Offer), Blue (Interview), Amber (Applied), Rose (Rejected)
- **Brand Sheet:** Generated via ChatGPT DALL-E. Final version has clean UI components matching extension functionality.

---

## 6. Data Model (Google Sheets Schema)

Single sheet named "Applications":

| Priority | Column | Type | Notes |
|---|---|---|---|
| Required | `id` | string | UUID or row timestamp |
| Required | `role` | string | Job title |
| **Required** | `company` | string | **Primary matching key** (never empty) |
| Required | `platform` | string | LinkedIn, Indeed, etc. (controlled list) |
| Optional | `job_link` | string | URL to job posting |
| **Optional** | `company_link` | string | LinkedIn company page or official site |
| Required | `date_applied` | date | ISO format (YYYY-MM-DD) |
| Required | `status` | string | Applied / Interview / Rejected / Offer / Withdrawn |
| Conditional | `interview_date` | date | Only if status = Interview |
| Optional | `notes` | string | Free text |

---

## 7. Google Cloud Platform Configuration

1. Create GCP project.
2. Enable **Google Sheets API** and **Google Drive API**.
3. Configure **OAuth Consent Screen** (External).
4. Create **OAuth 2.0 Client ID** for type "Extension Chrome".
   - Requires the Extension ID (generated when loading unpacked extension in Chrome).
5. Required scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`

**Status:** User has already started GCP setup. OAuth Client creation is paused waiting for the Extension ID (need to scaffold first).

---

## 8. Development Task Breakdown

### Task 1: Scaffolding & Extension Hookup
```bash
ng new candidex --standalone --routing --style=scss --skip-tests
```
- Enable Zoneless in `app.config.ts`
- Install Tailwind CSS + Lucide Angular
- Create `src/manifest.json` and `src/background.js`
- Set `outputHashing: none` in `angular.json`
- Build → Load in Chrome → Get Extension ID → Finish GCP OAuth setup

### Task 2: Core Layout & Routing Shell
- LayoutComponent (400px × 600px popup)
- Top nav with Dashboard / New Application / Track Response tabs
- Angular Router setup
- Google Fonts loaded (Plus Jakarta Sans + Inter)

### Task 3: Data Layer (GoogleSheetsService)
- `authenticate()` via `chrome.identity.getAuthToken()`
- `initializeDatabase()` — create sheet if missing
- `fetchApplications()`, `addApplication()`, `updateStatus()`

### Task 4: Dashboard Component
- Stats grid (Total, Interviews, Offers)
- Recent 5 applications list
- Empty state

### Task 5: New Application Form
- Reactive Form (Role, Company*, Job Link, Company Link, Platform, Date)
- Disabled camera icon with "Coming Soon" tooltip
- Wire to `addApplication()`

### Task 6: Track Response View
- Search bar (filter by company/role using Signals)
- Selectable result cards
- Status dropdown (Applied → Interview/Rejected/Offer)
- Conditional interview_date input
- Wire to `updateStatus()`

### Task 7: Final Polish & Audit
- Color audit against branding palette
- CSS transitions and hover states
- Accessibility (focus states, ARIA labels)
- No hardcoded API keys check

---

## 9. Puter.js AI Integration (Phase 2 — Future)

- Bundle `@heyputer/puter.js` via NPM (not CDN, for CSP compliance).
- Implement `chrome.tabs.captureVisibleTab` in background service worker.
- Defer Puter sign-in until first camera icon click.
- 4-step post-AI UX: Intent Picker → Review Fields → Fill Missing → Notes.
- "Don't show notes again" preference stored in `chrome.storage.local`.
- Full design details in `puter_ai_feasibility_report.md`.

---

## 10. Related Artifacts (in this conversation's brain directory)

| File | Purpose |
|---|---|
| `puter_ai_feasibility_report.md` | Complete AI integration design, prompts, and architecture |
| `implementation_plan.md` | Tech stack, configurations, and phased roadmap |
| `development_tasks.md` | Granular task checklist for development |
| `BRANDING.md` | Typography, colors, name proposals, and DALL-E prompts |
| `CANDIDEX_FULL_CONTEXT.md` | This file — full conversation export |

---

## 11. Current Status

- [x] Problem statement and competitive analysis defined
- [x] Architecture and principles finalized (PROJECT.md)
- [x] Puter.js AI feasibility confirmed
- [x] Dual-Path UX designed
- [x] Data model finalized (with `company_link`)
- [x] Tech stack decided (Angular 18+ Zoneless)
- [x] Brand identity established (Candidex)
- [x] GCP project created (OAuth Client paused — needs Extension ID)
- [ ] **NEXT:** Scaffold Angular project → Build → Get Extension ID → Resume GCP setup
