# Validation & Release Gates — Shared Link Overhaul

**Status:** Proposed Planning
**Date:** 2026-05-28

This document details the quality assurance, browser/device support, AI routing checks, performance budgets, and legal compliance gates that must be satisfied before any Shared Link (V2) changes are released.

---

## 1. Browser & Device Verification Matrix

Since the Shared Link is primarily viewed by external clients, it must be robust across mobile and desktop environments.

| Target | OS / Browser | Min Version | Scope | Verification Checklist |
|--------|--------------|-------------|-------|------------------------|
| **Mobile** | iOS / Safari | 16+ | Recipient View | Verify tab navigation (touch target sizes ≥ 44x44px), horizontal table scroll, sticky decision bar, comment layout, safe-area-inset-bottom. |
| **Mobile** | Android / Chrome | 120+ | Recipient View | Same as iOS Safari. Ensure zero page overflow or scroll stuttering. Test on mid-range device (e.g., Pixel 6a). |
| **Desktop** | macOS / Safari | 16+ | Manager + Recipient | Verify password entry, cookie decryption, comments posting, select checkboxes in workspace header. |
| **Desktop** | Windows / Chrome | 120+ | Manager + Recipient | Ensure layout pixel alignment, custom scrollbar spacing inside tables. |
| **Desktop** | Cross-platform / Firefox | 120+ | Recipient View | Check CSP compliance, focus ring outline visibility, ARIA navigation. |
| **Tablet** | iPadOS / Safari | 16+ | Recipient View | Verify split-view behavior, comment sidebar collapse, tab overflow. |

---

## 2. Accessibility (a11y) & Interactive Gates

To ensure compliance with WCAG 2.1 Level AA:

- [ ] **Tab List ARIA**: The horizontal sheet tab list must use `role="tablist"`, `role="tab"`, and `role="tabpanel"`. Pressing Left/Right arrows must move focus between tabs. Enter/Space activates.
- [ ] **Contrast**: Text contrast inside the receiver (which uses `#FFFDF8` warm background) must maintain a minimum of 4.5:1 ratio against the text color.
- [ ] **Form Labels**: Text inputs (password, email chips, comment composer) must have associated `<label>` elements or `aria-label`.
- [ ] **Live Regions**: Alert banners (e.g. "Comment posted", "Estimate accepted") must utilize `role="status"` or `aria-live="polite"` so screen readers announce state changes.
- [ ] **Keyboard Nav**: Users must be able to navigate the password entry form, tabs, and comment submission using `Tab` and `Enter` only.
- [ ] **Focus Management**: When a tab is activated, focus should move to the tabpanel or the first focusable element inside it.
- [ ] **Screen Reader Testing**: Verify with VoiceOver (macOS/iOS) and NVDA (Windows) that the entire comment-and-decision flow is comprehensible without visual cues.
- [ ] **Motion Preferences**: Respect `prefers-reduced-motion` for tab transitions and button hover effects.

---

## 3. AI Context Isolation (Security Guardrail)

Since the AI Copilot (Ask Flip) fetches context about the active route to formulate advice, we must ensure new database fields or draft states related to client comments or decisions do not leak into AI-exposed workspaces.

- [ ] Verify `src/lib/ai/read-context.ts` (or equivalent AI read lanes) does **not** include client comments, recipient email lists, or accept/decline history.
- [ ] Ensure that a Shared Link token is never sent as a context parameter to `/api/ai/ask` or `/api/ai/package-builder`.
- [ ] Audit that `shared_link_recipients.email` is not included in any `buildProjectPublicationSnapshot` or snapshot-related JSON.
- [ ] Confirm that new Supabase RLS policies on `shared_link_*` tables explicitly deny `anon` and `authenticated` direct select access.

**Current State**: AI routes do not read `project_publications` today, so the baseline risk is low. The gate ensures future context loaders stay clean.

---

## 4. Legal & Regulatory Compliance Gates

Before the Shared Link V2 features go live on production:

- [ ] **GDPR Opt-in Verification**: Confirm that no tracking scripts (GA4, Microsoft Clarity) are fired for viewers of `/share/[token]` unless they have accepted the analytics cookies via the `archestimator_cookie_consent` consent banner.
- [ ] **Standard Contractual Clauses (SCCs)**: Confirm that the company has signed the Supabase DPA covering the Singapore database region where client emails/comments will be processed.
- [ ] **Privacy Notice Update**: Verify that the `/privacy` page discloses the collection of recipient emails, comments, and decisions as part of the client estimate-review features.
- [ ] **Data Retention Disclosure**: Update the privacy notice to state that shared link data (recipients, comments, decisions) is retained until the link is revoked or the project is deleted.
- [ ] **Cookie Policy Update**: Ensure the cookie policy mentions the `shared_link_session_*` and `ae_publication_access_*` cookies and their purposes.

---

## 5. Performance Budgets

| Metric | Budget | Measurement Method |
|--------|--------|-------------------|
| Share Page TTFB | < 150ms | Lighthouse / WebPageTest |
| Share Page LCP | < 2.5s | Lighthouse |
| Share Page CLS | < 0.1 | Lighthouse |
| Tab Switch (client-side) | < 16ms | Chrome DevTools Performance |
| Comment POST P95 | < 200ms | Server-side timing logs |
| Decision POST P95 | < 200ms | Server-side timing logs |
| Snapshot JSON Size | < 500KB | Server-side payload logging |
| Build Bundle Size (share page) | < 150KB gzipped | `next-bundle-analyzer` |

---

## 6. Pre-Release Technical Checklist

- [ ] **Build Validation**: `bun run validate` passes with 0 failures, 0 TypeScript errors, and 0 linting warnings.
- [ ] **Next.js Compilation**: `bun run build` generates the optimized Next.js static and dynamic bundles successfully.
- [ ] **Design System Lint**: Verify no styling rules violate the 10-12px SF Pro compact system limits (`bun run lint:design-system`, `bun run lint:app-font-size`).
- [ ] **E2E Smoke Tests**: Run targeted Playwright integration tests confirming password protection, tab selection, comment submission, and decision recording.
- [ ] **Security Scan**: Run `npm audit` or `bun audit` and resolve any high/critical vulnerabilities.
- [ ] **Git Nexus Detection**: Run `gitnexus_detect_changes` to verify the modified files map exactly to the plan's expected blast radius.
- [ ] **Migration Validation**: Run `supabase db reset` locally and verify the migration applies cleanly with seed data.
- [ ] **Archival Handoff**: Prepare the final `walkthrough.md` mapping out the database migration, action updates, and receiver page layout.
