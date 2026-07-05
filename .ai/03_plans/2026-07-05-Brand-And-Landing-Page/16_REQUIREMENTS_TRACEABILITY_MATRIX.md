# 16 — Requirements Traceability Matrix

**Source authority:** `04_REQUIREMENTS_SPECIFICATION.md` (REQ-*), `11_IMPLEMENTATION_PLAN.md` (WP-*), `12_TEST_AND_VALIDATION_STRATEGY.md` (TEST-*).
**Status convention:** `pending` (default for planning), `in_progress`, `proven`, `contradicted`, `incomplete`, `weak_or_indirect`, `missing`, `blocked_with_evidence`, `deferred_with_rationale`, `not_applicable_with_reason`.

---

## 0. 2026-07-06 added traceability

These rows trace the continuation requirements added in `04` §0. They supersede weaker older rows where there is a conflict.

| REQ ID | WP | AC | TEST | Status | Notes |
|---|---|---|---|---|---|
| REQ-HERO-MOCKUP-PRESERVE | WP-1B / WP-2A | AC-HERO-MOCKUP-PRESERVE | TEST-HERO-MOCKUP | `pending` | User explicitly likes the above-the-fold mockup; preserve it. |
| REQ-HERO-COPY-FIT | WP-1B / WP-2A | AC-HERO-COPY-FIT | TEST-HERO-COPY-FIT | `pending` | Hero subhead max 20 words; H1 max 2 lines. |
| REQ-DESIGN-PRECISION-EDITORIAL | WP-1E / WP-5 | AC-DESIGN-PRECISION-EDITORIAL | TEST-DESIGN-PRECISION | `pending` | Corrected default in `09` §0 and `20` §0. |
| REQ-DESIGN-NO-FAKE-PROOF | WP-1B / WP-2A / WP-4A | AC-DESIGN-NO-FAKE-PROOF | TEST-CLAIMS-FAKE-PROOF | `pending` | Drops fake hero counters and fabricated proof. |
| REQ-VALIDATION-PROPORTIONAL | All WP | AC-VALIDATION-PROPORTIONAL | TEST-VALIDATION-PROPORTIONAL | `pending` | Planning-only docs use `git diff --check`; implementation chooses smallest proving check. |

---

## 1. Full traceability matrix

| REQ ID | WP | AC | TEST | Status | Notes |
|---|---|---|---|---|---|
| REQ-LINT-001..023 | WP-1A | AC-LINT-001..023 | TEST-LINT-001..023 | `pending` | Blocked on Phase 0 sign-off; Phase 1A may proceed on unambiguous phrases |
| REQ-HERO-H1 | WP-2A | AC-HERO-H1 | TEST-HERO-001 | `pending` | OPEN-DEC-001a |
| REQ-HERO-SUBHEAD | WP-1B / WP-2A | AC-HERO-SUBHEAD | TEST-HERO-002 | `pending` | |
| REQ-HERO-CTA | WP-1B | AC-HERO-CTA | TEST-HERO-003 | `pending` | OPEN-DEC-005 |
| REQ-HERO-BELOW-CTA | WP-2A | AC-HERO-BELOW-CTA | TEST-HERO-004 | `pending` | |
| REQ-HERO-METRIC-CARDS | WP-2A | AC-HERO-METRIC-CARDS | TEST-HERO-005 | `pending` | OPEN-DEC-008 |
| REQ-AUDIENCE-BANNER | WP-1B | AC-AUDIENCE-BANNER | TEST-STRUCTURE-001 | `pending` | |
| REQ-AUDIENCE-BAND | WP-2A | AC-AUDIENCE-BAND | TEST-HERO-006 | `pending` | |
| REQ-PROBLEM-EXPAND | WP-2A | AC-PROBLEM-EXPAND | TEST-PROBLEM-001 | `pending` | |
| REQ-PROBLEM-CLOSER | WP-2A | AC-PROBLEM-CLOSER | TEST-PROBLEM-002 | `pending` | |
| REQ-WORKFLOW-SCREENSHOTS | WP-2B | AC-WORKFLOW-SCREENSHOTS | TEST-WORKFLOW-001 | `pending` | 4 screenshots |
| REQ-FEATURE-CH1-LIBRARY | WP-2B | AC-FEATURE-CH1 | TEST-FEATURE-001 | `pending` | |
| REQ-FEATURE-CH2-PROPOSAL | WP-2B | AC-FEATURE-CH2 | TEST-FEATURE-002 | `pending` | |
| REQ-FEATURE-CH3-ACTIVITY | WP-2B | AC-FEATURE-CH3 | TEST-FEATURE-003 | `pending` | |
| REQ-FEATURE-CH4-PRIVACY-NEW | WP-2B | AC-FEATURE-CH4 | TEST-FEATURE-004 | `pending` | OPEN-DEC-007 |
| REQ-SPECIALTIES-7 | WP-2C | AC-SPECIALTIES-7 | TEST-SPECIALTIES-001 | `pending` | OPEN-DEC-006 |
| REQ-COMPARISON-LINKS | WP-4B | AC-COMPARISON-LINKS | TEST-COMPARISON-001 | `pending` | |
| REQ-PROOF-REBUILD | WP-4A | AC-PROOF-REBUILD | TEST-PROOF-001 | `pending` | |
| REQ-PROOF-COMPANY-GATE | WP-4A | AC-PROOF-COMPANY-GATE | TEST-PROOF-002 | `pending` | |
| REQ-FAQ-REPLACE | WP-4A | AC-FAQ-REPLACE | TEST-FAQ-001 | `pending` | |
| REQ-FINAL-CTA | WP-4B | AC-FINAL-CTA | TEST-FINAL-CTA-001 | `pending` | |
| REQ-FOOTER-COMPANY | WP-1C | AC-FOOTER-COMPANY | TEST-FOOTER-001 | `pending` | |
| REQ-FOOTER-COMPLIANCE | WP-1C | AC-FOOTER-COMPLIANCE | TEST-FOOTER-002 | `pending` | |
| REQ-FOOTER-VALUE-ANCHOR | WP-1C | AC-FOOTER-VALUE-ANCHOR | TEST-FOOTER-003 | `pending` | |
| REQ-FOOTER-LINKS | WP-1C | AC-FOOTER-LINKS | TEST-FOOTER-004 | `pending` | |
| REQ-SECTION-ORDER | WP-1D | AC-SECTION-ORDER | TEST-STRUCTURE-002 | `pending` | |
| REQ-PRICING-META | WP-3A | AC-PRICING-META | TEST-PRICING-001 | `pending` | OPEN-DEC-002 |
| REQ-PRICING-HERO | WP-3A | AC-PRICING-HERO | TEST-PRICING-002 | `pending` | OPEN-DEC-002 |
| REQ-PRICING-CEMENT-ANCHOR | WP-3A | AC-PRICING-CEMENT-ANCHOR | TEST-PRICING-003 | `pending` | OPEN-DEC-002 |
| REQ-PRICING-TIER-SHAPE | WP-3A | AC-PRICING-TIER-SHAPE | TEST-PRICING-004 | `pending` | OPEN-DEC-002 |
| REQ-PRICING-VALIDATION-MOVE | WP-3A | AC-PRICING-VALIDATION-MOVE | TEST-PRICING-005 | `pending` | OPEN-DEC-002 |
| REQ-FEATURES-META | WP-3B | AC-FEATURES-META | TEST-FEATURES-001 | `pending` | |
| REQ-FEATURES-HERO | WP-3B | AC-FEATURES-HERO | TEST-FEATURES-002 | `pending` | |
| REQ-FEATURES-LEDGER-ORDER | WP-3B | AC-FEATURES-LEDGER-ORDER | TEST-FEATURES-003 | `pending` | OPEN-DEC-001 |
| REQ-FEATURES-AI-SECTION-DROP | WP-3B | AC-FEATURES-AI-SECTION-DROP | TEST-FEATURES-004 | `pending` | OPEN-DEC-003 |
| REQ-ABOUT-META | WP-3C | AC-ABOUT-META | TEST-ABOUT-001 | `pending` | |
| REQ-ABOUT-HERO | WP-3C | AC-ABOUT-HERO | TEST-ABOUT-002 | `pending` | |
| REQ-ABOUT-INTRO | WP-3C | AC-ABOUT-INTRO | TEST-ABOUT-003 | `pending` | |
| REQ-ABOUT-FOUNDER | WP-3C | AC-ABOUT-FOUNDER | TEST-ABOUT-004 | `pending` | OPEN-DEC-004 |
| REQ-ABOUT-LIMITATIONS | WP-3C | AC-ABOUT-LIMITATIONS | TEST-ABOUT-005 | `pending` | |
| REQ-CONTACT-META | WP-3D | AC-CONTACT-META | TEST-CONTACT-001 | `pending` | |
| REQ-CONTACT-HERO | WP-3D | AC-CONTACT-HERO | TEST-CONTACT-002 | `pending` | |
| REQ-CONTACT-DESIGN-PARTNERS | WP-3D | AC-CONTACT-DESIGN-PARTNERS | TEST-CONTACT-003 | `pending` | |
| REQ-CONTACT-DUAL-CTA | WP-3D | AC-CONTACT-DUAL-CTA | TEST-CONTACT-004 | `pending` | OPEN-DEC-005 |
| REQ-DESIGN-TOKENS-DOC | WP-5 | AC-DESIGN-TOKENS-DOC | TEST-DESIGN-001 | `pending` | DESIGN.md landing-tokens section |
| REQ-DESIGN-TOKENS-IMPL | WP-1E | AC-DESIGN-TOKENS-IMPL | TEST-DESIGN-002 | `pending` | CSS custom properties land in `landing-v3.module.css` |
| REQ-TYPE-SCALE | WP-1E | AC-TYPE-SCALE | TEST-DESIGN-003 | `pending` | No landing text exceeds 4rem; H1 is largest |
| REQ-PRECISION-FRAME | WP-1E / WP-2A / WP-2B / WP-2C / WP-4A | AC-PRECISION-FRAME | TEST-DESIGN-004 | `pending` | Repeated cards and screenshots use precision frames; hero mockup keeps its current product-stage frame |
| REQ-ISLAND-BUTTON | WP-1B / WP-1E | AC-ISLAND-BUTTON | TEST-DESIGN-005 | `pending` | Primary/secondary CTAs share pill geometry + icon island |
| REQ-FLOATING-NAV | WP-1E | AC-FLOATING-NAV | TEST-DESIGN-006 | `pending` | Floating glass pill; hamburger-to-X mobile menu |
| REQ-SCROLL-REVEAL | WP-1E | AC-SCROLL-REVEAL | TEST-DESIGN-007 | `pending` | IntersectionObserver-based reveal + reduced-motion path |
| REQ-MONO-FONT-REPLACE | WP-1E | AC-MONO-FONT-REPLACE | TEST-DESIGN-008 | `pending` | No Roboto Mono / banned fonts in landing CSS/JSX |
| REQ-NAV-SIGNIN-UNIFICATION | WP-1B | AC-NAV-SIGNIN-UNIFICATION | TEST-DESIGN-009 | `pending` | Nav "Sign in" is a secondary CTA pill |
| REQ-AB-VARIANT-B | WP-6 | AC-AB-VARIANT-B | TEST-AB-001 | `pending` | |
| REQ-ANALYTICS-EVENTS | WP-6 | AC-ANALYTICS-EVENTS | TEST-ANALYTICS-001 | `pending` | |
| REQ-MEASUREMENT-PLAN | WP-6 | AC-MEASUREMENT-PLAN | TEST-MEASUREMENT-001 | `pending` | |

---

## 2. Coverage summary

| Status | Count | % |
|---|---|---|
| `pending` (planning complete, implementation not started) | 58 | 100% |
| `proven` | 0 | 0% |
| `contradicted` | 0 | 0% |
| `incomplete` | 0 | 0% |
| `weak_or_indirect` | 0 | 0% |
| `missing` | 0 | 0% |
| `blocked_with_evidence` | 0 | 0% |
| `deferred_with_rationale` | 0 | 0% |
| `not_applicable_with_reason` | 0 | 0% |
| **Total** | **58** | **100%** |

**Reading:** All 58 requirements are traced to a WP, AC, and TEST. Implementation has not started. This is the expected state at planning-pass completion.

---

## 3. Coverage by phase

| Phase | REQs | Status |
|---|---|---|
| Phase 0 (founder sign-off) | All (unblocks Phase 1+) | `pending` founder response |
| Phase 1A (lint pass) | REQ-LINT-001..023 (23) | `pending` |
| Phase 1B (hero CTA + nav/button unification) | REQ-HERO-CTA, REQ-HERO-SUBHEAD, REQ-AUDIENCE-BANNER, REQ-NAV-SIGNIN-UNIFICATION, REQ-ISLAND-BUTTON (5) | `pending` |
| Phase 1C (footer) | REQ-FOOTER-COMPANY, REQ-FOOTER-COMPLIANCE, REQ-FOOTER-VALUE-ANCHOR, REQ-FOOTER-LINKS (4) | `pending` |
| Phase 1D (section reorder) | REQ-SECTION-ORDER (1) | `pending` |
| Phase 1E (visual system foundation) | REQ-DESIGN-TOKENS-IMPL, REQ-TYPE-SCALE, REQ-PRECISION-FRAME, REQ-ISLAND-BUTTON, REQ-FLOATING-NAV, REQ-SCROLL-REVEAL, REQ-MONO-FONT-REPLACE (7) | `pending` |
| Phase 2A (hero rewrite) | REQ-HERO-H1, REQ-HERO-BELOW-CTA, REQ-HERO-METRIC-CARDS, REQ-AUDIENCE-BAND, REQ-PROBLEM-EXPAND, REQ-PROBLEM-CLOSER (6) | `pending` |
| Phase 2B (workflow + chapters) | REQ-WORKFLOW-SCREENSHOTS, REQ-FEATURE-CH1..4 (5) | `pending` |
| Phase 2C (specialties 7) | REQ-SPECIALTIES-7 (1) | `pending` |
| Phase 3A (/pricing) | REQ-PRICING-META, REQ-PRICING-HERO, REQ-PRICING-CEMENT-ANCHOR, REQ-PRICING-TIER-SHAPE, REQ-PRICING-VALIDATION-MOVE (5) | `pending` |
| Phase 3B (/features) | REQ-FEATURES-META, REQ-FEATURES-HERO, REQ-FEATURES-LEDGER-ORDER, REQ-FEATURES-AI-SECTION-DROP (4) | `pending` |
| Phase 3C (/about) | REQ-ABOUT-META, REQ-ABOUT-HERO, REQ-ABOUT-INTRO, REQ-ABOUT-FOUNDER, REQ-ABOUT-LIMITATIONS (5) | `pending` |
| Phase 3D (/contact) | REQ-CONTACT-META, REQ-CONTACT-HERO, REQ-CONTACT-DESIGN-PARTNERS, REQ-CONTACT-DUAL-CTA (4) | `pending` |
| Phase 4A (proof + FAQ) | REQ-PROOF-REBUILD, REQ-PROOF-COMPANY-GATE, REQ-FAQ-REPLACE (3) | `pending` |
| Phase 4B (final CTA + comparison) | REQ-FINAL-CTA, REQ-COMPARISON-LINKS (2) | `pending` |
| Phase 5 (visual refresh) | REQ-DESIGN-TOKENS-DOC (1) | `pending` |
| Phase 6 (A/B + analytics) | REQ-AB-VARIANT-B, REQ-ANALYTICS-EVENTS, REQ-MEASUREMENT-PLAN (3) | `pending` |
| **Total** | **~50 REQs (with multi-phase REQs counted once)** | |

---

## 4. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1 Full matrix | Implementation agent's checklist |
| §2 Coverage summary | `17` readiness audit |
| §3 Coverage by phase | `11` phase scope verification |
