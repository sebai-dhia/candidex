# Development Task Breakdown: Candidex

This document breaks down the high-level phases from our implementation plan into granular, actionable development tasks. We will execute these tasks sequentially.

---

## Task 1: Scaffolding & Extension Hookup
**Goal:** Establish the Angular repository, configure it for Chrome, and finalize the Google Cloud OAuth setup.

- [x] Run `ng new candidex --standalone --routing --style=scss --skip-tests` in the workspace.
- [x] Configure `app.config.ts` to use `provideExperimentalZonelessChangeDetection()`.
- [x] Install and configure Tailwind CSS v3/v4 and `lucide-angular`.
- [x] Create `src/manifest.json` with base permissions (`identity`, `storage`) and placeholder OAuth client ID.
- [x] Create an empty `src/background.js` service worker.
- [x] Update `angular.json` to disable `outputHashing` and include `manifest.json` and `background.js` in the assets array.
- [x] Run `ng build`.
- [x] Load the `dist/candidex/browser` folder into Chrome (`chrome://extensions`) to generate the **Extension ID**.
- [x] Use the Extension ID to finish creating the OAuth Client in Google Cloud Console.
- [x] Copy the generated Client ID back into `manifest.json`.

---

## Task 2: Core Layout & Routing Shell
**Goal:** Build the primary UI container that acts as the extension's slide-out panel.

- [x] Create a `LayoutComponent` to act as the main app shell.
- [x] Apply Tailwind classes to enforce a fixed width/height suitable for a Chrome extension popup (e.g., `w-[400px] h-[600px] overflow-y-auto`).
- [x] Build a top navigation bar with the "Candidex" logo and tabs/links for: **Dashboard**, **New Application**, and **Track Response**.
- [x] Set up Angular Router to navigate between these three placeholder components.
- [x] Enforce the typography (`Plus Jakarta Sans` for headers, `Inter` for body) and primary Indigo brand color in the global CSS.

---

## Task 3: The Data Layer (Google Sheets Service)
**Goal:** Build the Angular Service that securely handles all external communication.

- [ ] Create `GoogleSheetsService` (`ng g s services/google-sheets`).
- [ ] Implement `authenticate()`: Wraps Chrome's `chrome.identity.getAuthToken({ interactive: true })`.
- [ ] Implement `initializeDatabase()`: Checks Google Drive for the "Candidex Tracker" spreadsheet. If missing, creates it and writes the header row.
- [ ] Implement CRUD methods using the Google Sheets REST API:
  - `fetchApplications()`: Reads the sheet and maps rows to strongly-typed TypeScript interfaces.
  - `addApplication(data)`: Appends a new row.
  - `updateStatus(id, newStatus, date?)`: Updates a specific row.

---

## Task 4: The Dashboard Component
**Goal:** Build the landing view that shows tracking statistics.

- [ ] Create `DashboardComponent`.
- [ ] Build a "Stats Grid" showing Total Applications, Total Interviews, and Total Offers.
- [ ] Build a "Recent Applications" list component that displays the last 5 entries fetched from the `GoogleSheetsService`.
- [ ] Add empty states (e.g., "No applications tracked yet. Click 'New Application' to start!").

---

## Task 5: The "New Application" Form
**Goal:** Build the manual entry form (Path A).

- [ ] Create `ApplyFormComponent`.
- [ ] Build an Angular Reactive Form with fields: Role, Company (Required), Job Link, Company Link, Platform, Date Applied.
- [ ] Add the disabled "Camera Icon" (for Phase 2 AI integration) in the top right corner with a "Coming Soon" tooltip.
- [ ] Wire the form submission to `GoogleSheetsService.addApplication()`.
- [ ] Add a success toast/notification upon successful save, and clear the form.

---

## Task 6: The "Track Response" View
**Goal:** Build the search and update interface.

- [ ] Create `ResponseTrackingComponent`.
- [ ] Build a search bar to filter applications by `company` or `role` locally (using Angular Signals for fast filtering).
- [ ] Render the filtered results as a list of selectable cards.
- [ ] When a card is selected, show a status update dropdown (Applied, Interview, Rejected, Offer).
- [ ] If "Interview" is selected, dynamically show an "Interview Date" input field.
- [ ] Wire the save button to `GoogleSheetsService.updateStatus()`.

---

## Task 7: Final Polish & Audit
**Goal:** Ensure the extension feels like a premium SaaS product.

- [ ] Audit all colors against the `BRANDING.md` palette (Indigo, Slate, Amber, Emerald, Rose).
- [ ] Add subtle CSS transitions (`transition-all duration-200`) to buttons and form inputs.
- [ ] Ensure focus states (tabbing through the form) are accessible and visible.
- [ ] Verify that no API keys are hardcoded in the repository.
