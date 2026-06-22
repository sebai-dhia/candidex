# Brand Identity & Styling Sheet

Before writing any code, it is critical to establish a cohesive design system. This document outlines the proposed brand identity for the extension, focusing on a premium, clean, and frictionless aesthetic.

---

## 1. Extension Name Proposals

Since the core differentiator is matching responses back to applications, the name should imply tracking, synchronization, or closing the loop.

**Highly Abstract / Invented Name Proposals:**
*(These are completely fabricated or metaphorical to guarantee they do not conflict with existing HR/Job tools)*

1. **Hireloom** (Hire + Heirloom) - Implies a safe, valuable place where you keep your career history and application data.
2. **Plia** - A sleek, 4-letter Web3/SaaS style name derived from "Apply". Extremely clean and minimalist.
3. **Vancara** (Vanguard + Career) - Sounds like a premium, high-end professional tool.
4. **Jovox** (Job + Vox) - Short, punchy, and highly brandable for an icon/logo.
5. **Kairon** - Derived from *Kairos*, the ancient Greek word for "the opportune moment." Perfect for an app about catching the right job opportunity.

*(Let me know which vibe you prefer, or if you have another name in mind!)*

---

## 2. Typography

For a modern, data-dense extension, legibility and premium feel are key. We recommend a two-font pairing from Google Fonts:

* **Primary / Headings:** **[Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)**
  * *Why:* It has a highly modern, geometric feel that looks incredible in bold weights for dashboard numbers and app headers.
* **Secondary / UI Text:** **[Inter](https://fonts.google.com/specimen/Inter)**
  * *Why:* The gold standard for modern UI design. It is highly legible at small sizes (crucial for Chrome extension panels).

---

## 3. Color Palette (Tailwind Vibe)

We want a palette that feels trustworthy, smart, and not overly aggressive. 

* **Primary Brand Color: Indigo / Violet**
  * Implies intelligence and modern AI-assist tools.
  * Primary Button: `bg-indigo-600` (Hover: `bg-indigo-700`)
  * AI Highlights: `bg-amber-100` with `text-amber-800` (for the ✨ AI pre-filled fields)
* **Neutrals: Slate or Zinc**
  * Instead of pure black/gray, Slate brings a subtle cool-blue tint that pairs beautifully with Indigo.
  * Backgrounds: `bg-slate-50` (soft off-white)
  * Text: `text-slate-900` (primary), `text-slate-500` (secondary/hints)
* **Status Colors:**
  * 🟢 Offer: `emerald-500`
  * 🔵 Interview: `blue-500`
  * 🟡 Applied: `amber-400`
  * 🔴 Rejected: `rose-500`

---

## 4. UI/UX "Vibe"
* **Borders:** Subtle `border-slate-200` for cards.
* **Shadows:** Soft, diffused shadows (`shadow-sm` for inputs, `shadow-lg` for the intent-picker modal).
* **Corner Radius:** Slightly rounded, modern but professional (`rounded-xl` for cards, `rounded-lg` for inputs).

---

## 5. Image Generation Prompt

You can copy and paste this prompt directly into ChatGPT (DALL-E 3) or Midjourney to generate a visual brand board/UI Kit to see how these elements look together:

> **Prompt:**
> A professional UI/UX brand identity sheet for a modern Chrome extension. The extension is a manual-first Job Application Tracker (no heavy AI scoring, no external integrations like Notion). The style should be clean, minimalist, and premium, heavily inspired by modern SaaS dashboards (like Vercel or Stripe). 
> 
> The brand sheet should display:
> 1. A sleek, abstract app icon logo.
> 2. A color palette featuring Indigo as the primary color, soft amber for AI highlights, and clean Slate/Zinc grays for neutrals.
> 3. Typography samples using Inter or Plus Jakarta Sans.
> 4. UI components that fit a job tracking extension: 
>    - A clean dropdown menu showing status tags: "Applied" (amber), "Interview" (blue), "Offer" (emerald), "Rejected" (rose).
>    - A minimalistic data row showing a job application (e.g., "Software Engineer at Acme Corp, Applied on Oct 12").
>    - A simple, modern search bar for filtering applications.
> 
> The background should be pure white. High resolution, flat vector design, UI/UX presentation layout.
> 
> ---
> **To edit the "AI Insight" tag in your existing generated image:**
> Highlight just the "AI Highlight / Tag" section at the bottom center (the one that says 'AI Insight Strong match') and use this prompt:
> *Change this UI component to be a simple search bar. Draw a clean, rounded rectangular input field with a small magnifying glass icon on the left, and the placeholder text "Search companies or roles..." inside it. Remove any text about 'AI Insight' or 'Strong match'.*
