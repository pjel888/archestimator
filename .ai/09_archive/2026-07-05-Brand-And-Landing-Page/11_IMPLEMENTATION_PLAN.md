# 11 — Implementation Plan (Phased Rollout)

**Source authority:** `02_FEATURE_BRIEF_AND_SCOPE.md` (scope), `06_BRAND_AND_COPY_DIRECTION.md` (copy direction), `07_LANDING_PAGE_SECTIONS.md` (target architecture), `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` and `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` (visual direction), `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` (OPEN-DECs).
**Plan kind:** Planning-only. Implementation is a separate pass. Safe defaults below can proceed without waiting for all earlier OPEN-DECs.
**Verification mode:** `emulated` — caps total readiness at `CONDITIONALLY READY`.

---

## 0. 2026-07-06 execution correction

The earlier phase plan was too blocked and too heavyweight for the actual task. This correction supersedes Phase 0 and the default QA gates wherever they conflict.

### 0.1 Implementation invariants

- Preserve the current hero estimate-sheet mockup and above-the-fold product composition.
- Do not replace the hero with a generic SaaS layout, illustration, dark-mode scene, or screenshot grid.
- Remove fake metric counters unless a real, non-adoption product metric is explicitly supplied.
- Keep copy concrete and short. Hero subhead max 20 words.
- Use the corrected Precision Editorial visual system in `09` §0 and `20` §0.
- Do not introduce new dependencies, fonts, analytics providers, or provider changes.

### 0.2 Work that is unblocked by default

These changes are safe defaults because they follow direct user feedback and do not require brand reinvention:

| Work | Default |
|---|---|
| Hero subhead cleanup | Use the `19` §0 short subhead. |
| Above-fold preservation | Keep `HeroEstimateWorkspaceMockup` and current hero media composition. |
| AudienceBanner | Remove the stacked sticky banner. |
| Nav/button consistency | Make "Sign in" visually related to the CTA. |
| Fake counters | Replace with ordinals/behavior proof; no animated numbers. |
| Beta-apology wording | Remove banned phrases on conversion surfaces. |
| Footer legitimacy | Add company, privacy, and value-anchor lines without overclaiming. |
| Visual system | Use Precision Editorial unless the founder explicitly chooses another direction. |

### 0.3 Work that still needs founder input

Only these decisions are true blockers:

| Decision | Blocks |
|---|---|
| Access model CTA: "Request access" vs "Start free" | Final CTA labels and hrefs. Default is "Request access" until `/signup` is verified self-serve. |
| Founder bio/photo | Final `/about` founder block content. Default is the existing one-line founder rationale with "bio coming" removed. |
| Public pricing numbers | Any numeric price publication. This plan does not publish numbers. |
| Final screenshot/proof selection | Which real product screenshots ship in proof sections. Seed/demo screenshots are the default. |
| Explicit rejection of Precision Editorial | Only if the founder wants a warmer/darker archetype. |

### 0.4 Proportional validation

Use the narrowest check that proves the changed behavior:

- Planning-only edits: `git diff --check`.
- Copy-only source edits: copy lint plus targeted type/lint if source touched.
- CSS/visual source edits: targeted lint/type plus browser proof only for the specific responsive or interaction claim.
- Shared logic, auth, provider, or release work: broader `bun run validate` or build as justified.

Do not require Playwright, screenshots, visual QA, `bun run validate`, or `bun run build` for every phase by default.

---

## 1. Phase overview

| Phase | Goal | Blocked on | Files touched | Parallel-safe? |
|---|---|---|---|---|
| **Phase 0** | Confirm true blockers and defaults, not all OPEN-DECs | CTA access model, founder content, pricing numbers, proof selection, visual override only | None | N/A |
| **Phase 1A** | Beta-wording lint pass on conversion surfaces | Unblocked default | `src/app/{pricing,features,about,contact}/page.tsx`, `src/lib/landing/seo-metadata.ts`, `src/components/landing/claims-ledger/claims-data.ts` (footer abbreviation only) | ✅ Yes (different files from 1B/1C/1D) |
| **Phase 1B** | Hero copy + nav cleanup + button visual unification | CTA label only; default "Request access" | `src/app/page.tsx`, `src/components/landing-v3/landing-content.ts` (LOGIN_HREF/WALKTHROUGH_HREF/WORKSPACE_HREF constants + Hero CTA copy), `landing-v3.module.css` (nav + CTA styles) | ✅ Yes |
| **Phase 1C** | Footer rebuild | Unblocked default | `src/components/landing-v3/ArchestimatorLandingPage.tsx` (LandingFooter function only) | ✅ Yes |
| **Phase 1D** | Section reorder on existing copy | Unblocked default | `src/components/landing-v3/ArchestimatorLandingPage.tsx` (main composition only; reorder sections, do not rewrite copy) | ✅ Yes |
| **Phase 1E** | Visual system foundation: tokens, type scale, precision frames, CTA geometry | Founder override only | `src/components/landing-v3/landing-v3.module.css` (token layer + primitives + motion); optionally `src/app/globals.css` landing-only layers | ✅ Yes (touches CSS only; no JSX overlap with 1A/1C/1D) |
| **Phase 2A** | Hero rewrite + Problem section expansion | Phase 1A, 1B, 1D, 1E | `src/components/landing-v3/landing-content.ts` + `ArchestimatorLandingPage.tsx` Hero + ProblemSection functions | ❌ Sequential (after 1A/1B/1D/1E — shared files and visual baseline) |
| **Phase 2B** | Workflow + FeatureChapters rebuilt with real screenshots | Phase 2A | `ArchestimatorLandingPage.tsx` WorkflowStory + FeatureChapters; new screenshot captures in `public/landing/screenshots/` | ❌ Sequential |
| **Phase 2C** | Specialties expand from 3 → 7 | Phase 2A | `landing-content.ts` specialties array; `ArchestimatorLandingPage.tsx` SpecialtiesSection render | ❌ Sequential |
| **Phase 3A** | /pricing reframe | Phase 2B | `src/app/pricing/page.tsx` | ✅ Yes (parallel with 3B/3C/3D after 2B) |
| **Phase 3B** | /features reframe | Phase 2B | `src/app/features/page.tsx`, `src/components/landing/claims-ledger/{claims-data.ts,ClaimsLedger.tsx}` | ✅ Yes |
| **Phase 3C** | /about reframe | Phase 2B, 2C | `src/app/about/page.tsx` | ✅ Yes |
| **Phase 3D** | /contact reframe | Phase 2B | `src/app/contact/page.tsx` | ✅ Yes |
| **Phase 4A** | Proof section rebuild + FAQ replace | Phase 3A–3D | `ArchestimatorLandingPage.tsx` ProofSection + FaqSection; `landing-content.ts` productProof + faqs arrays | ❌ Sequential |
| **Phase 4B** | Final CTA + Comparison tighten | Phase 4A | `ArchestimatorLandingPage.tsx` FinalCta + ComparisonSection; `landing-content.ts` comparisonRows | ❌ Sequential |
| **Phase 5** | Final visual polish + DESIGN.md additions + token reconciliation | Phase 4B | `DESIGN.md` (landing-tokens section), `src/components/landing-v3/landing-v3.module.css`, `src/app/globals.css` (landing-only) | ❌ Sequential (shares files with Phase 2/3/4) |
| **Phase 6** | A/B test + analytics instrumentation + measurement | Phase 5 | `src/components/landing/ABExperimentProvider.tsx`, `src/components/landing/LandingAnalyticsLoader.tsx`, possibly new variants in `landing-content.ts` | ❌ Sequential |

---

## 2. Phase 0 — True-blocker confirmation

**Goal ID:** WP-0
**Objective:** Confirm the small set of decisions that actually change product access, founder identity, pricing, proof assets, or the visual archetype. Everything else uses safe defaults.
**Scope:** Founder review only; no file edits.
**Requirements covered:** All requirements that need owner judgment; Phase 1 defaults remain unblocked.
**Required evidence:** Founder response on the true blockers in `15` §0, or documented default selection.
**Completion audit:** CTA access model, founder bio default, pricing-number constraint, proof-asset source, and visual-archetype default are each resolved or defaulted.
**Stop condition:** True blockers resolved or defaults documented.
**Blocker condition:** Founder rejects the entire brand premise or the hero preservation invariant. Plan must be re-scoped.
**Review gate:** N/A (founder is the gate).
**QA gate:** N/A.

---

## 3. Phase 1 — Atomic slices (parallel-safe, no founder content needed)

These five phases can run concurrently after the true-blocker defaults in §0 are recorded. Each touches a different file scope.

### Phase 1A — Anti-beta-wording lint pass

**Goal ID:** WP-1A
**Objective:** Remove every banned phrase in `06` §3.2 from marketing surfaces. Apply the replacement pattern. Add a CI lint rule that catches regressions.
**Scope:** Marketing surfaces only — `src/app/{/,pricing,features,about,contact}/page.tsx` metadata; `src/components/landing/claims-ledger/claims-data.ts` footer abbreviation only (not the data rows). Legal/access surfaces (`/terms`, `/privacy`, `/access-required`, `/signup`, `/workshop/feedback`) are OUT of scope.
**Requirements covered:** REQ-LINT-001 through REQ-LINT-023 (one per banned phrase in `06` §3.2).
**Required evidence:**
1. `rg` output showing zero matches for the banned phrases on marketing surfaces.
2. A new CI script (e.g., `scripts/landing-copy-lint.mjs`) that greps the marketing-surface scope and exits non-zero on any banned-phrase match.
3. `bun run lint:design-system` still passes.
4. Targeted lint/type checks still pass; full `bun run validate` is reserved for release or high-blast-radius changes.
**Completion audit:** Zero banned phrases on marketing surfaces + lint rule landed + CI green.
**Stop condition:** All four pieces of evidence captured.
**Blocker condition:** A banned phrase cannot be removed without recasting canon → escalate as new OPEN-DEC.
**Review gate:** Code review on the lint script.
**QA gate:** Copy lint plus targeted type/lint. Browser audit only if the implementation changes visible layout or interaction.

### Phase 1B — Hero CTA + nav cleanup + button visual unification

**Goal ID:** WP-1B
**Objective:** Replace "Book a walkthrough" primary CTA on hero and final CTA with "Request access" until self-serve signup is verified. Tighten hero subhead copy. Remove the AudienceBanner. Unify the nav "Sign in" link with the CTA as a secondary pill. Begin the nav transition toward a contained/floating treatment (full nav decision lands in WP-1E).
**Scope:** `src/app/page.tsx`, `src/components/landing-v3/landing-content.ts` (CTA hrefs + Hero copy), `src/components/landing-v3/ArchestimatorLandingPage.tsx` Hero + AudienceBanner + LandingNav functions, `src/components/landing-v3/landing-v3.module.css` (nav + CTA styles).
**Requirements covered:** REQ-HERO-CTA, REQ-HERO-SUBHEAD, REQ-AUDIENCE-BANNER, REQ-NAV-SIGNIN-UNIFICATION.
**Required evidence:**
1. Hero primary CTA copy changed.
2. Hero subhead recast (no cliché, no lowercase, no sales-register).
3. AudienceBanner component removed from the page composition.
4. Nav "Sign in" is visually a secondary CTA pill, matching the primary CTA geometry.
5. Primary CTA uses the button-in-button trailing icon island pattern.
6. Targeted checks green.
**Completion audit:** Hero CTA + subhead + banner + nav/CTA visual unification land. A/B experiment `hero-cta-copy` variant B is now the new CTA copy.
**Stop condition:** All six evidence items captured; build green.
**Review gate:** Code review.
**QA gate:** Targeted type/lint plus browser check only for hero/nav fit and interaction.

### Phase 1C — Footer rebuild

**Goal ID:** WP-1C
**Objective:** Add company line + compliance line + value anchor to the footer. Tighten copyright to the campaign tagline. Add `/trust` to the link list (and `/changelog` / `/roadmap` if they exist).
**Scope:** `src/components/landing-v3/ArchestimatorLandingPage.tsx` LandingFooter function only.
**Requirements covered:** REQ-FOOTER-COMPANY, REQ-FOOTER-COMPLIANCE, REQ-FOOTER-VALUE-ANCHOR, REQ-FOOTER-LINKS.
**Required evidence:** LandingFooter renders the 4 new elements; mobile responsive; targeted checks green.
**Completion audit:** All 4 new footer elements present and visually correct on desktop + mobile.
**Stop condition:** Updates land.
**Review gate:** Code review.
**QA gate:** Static/DOM check unless responsive footer behavior requires browser proof.

### Phase 1D — Section reorder on existing copy

**Goal ID:** WP-1D
**Objective:** Reorder the section composition in `ArchestimatorLandingPage.tsx` to match the target altitude graph (`07` §1). No copy changes — just section order. Specifically: move Specialties above AudienceBand; move Comparison above Proof; ensure Proof + FAQ sit before FinalCta.
**Scope:** `src/components/landing-v3/ArchestimatorLandingPage.tsx` main composition function only.
**Requirements covered:** REQ-SECTION-ORDER.
**Required evidence:** Page composition matches the target altitude graph; no section content changed (only order); targeted checks green.
**Completion audit:** Section order matches `07` §1.
**Stop condition:** Reorder lands.
**Review gate:** Code review.
**QA gate:** Manual scroll-through.

### Phase 1E — Visual system foundation

**Goal ID:** WP-1E
**Objective:** Establish the landing-only visual baseline before the heavy copy recasts. Apply the Precision Editorial palette, the unified stepped type scale, the precision-frame primitive, shared CTA geometry, the contained/floating nav treatment, and restrained motion rules.
**Scope:** `src/components/landing-v3/landing-v3.module.css` (token layer + component primitives + motion); optionally `src/app/globals.css` landing-only layers. No JSX changes in this phase.
**Requirements covered:** REQ-DESIGN-TOKENS, REQ-TYPE-SCALE, REQ-PRECISION-FRAME, REQ-ISLAND-BUTTON, REQ-FLOATING-NAV, REQ-SCROLL-REVEAL, REQ-MONO-FONT-REPLACE.
**Required evidence:**
1. CSS custom properties in `landing-v3.module.css` match the corrected token table in `09` §0 and §4.1.
2. Literal `Roboto Mono` fallbacks are removed if an existing configured mono is available; no new font dependency is added.
3. Precision-frame primitives exist and are used by at least one repeated card family below the hero.
4. Primary and secondary CTAs share pill geometry; the primary CTA has a nested icon island.
5. Nav is visually contained and not paired with the AudienceBanner; mobile menu remains accessible.
6. If scroll reveal is added, reduced-motion path exists. If not added, document why existing hero motion is sufficient.
7. Targeted type/lint check green; browser proof only for nav/mobile/interaction claims.
**Completion audit:** Visual primitives render correctly in the changed surface; no fake metrics or over-rounded repeated cards remain.
**Stop condition:** All 7 evidence items captured.
**Blocker condition:** Founder explicitly rejects Precision Editorial without choosing an alternative, or a nav change introduces accessibility risk.
**Review gate:** Code review + founder visual review.
**QA gate:** Targeted type/lint plus browser proof only for changed interaction or responsive layout.

---

## 4. Phase 2 — Hero + structural recasts (sequential)

### Phase 2A — Hero rewrite + Problem expansion

**Goal ID:** WP-2A
**Objective:** Full hero rewrite per `07` §2.1 and `07` §3.2. Problem section expansion per `07` §2.2. Preserve the current hero estimate-sheet mockup. Drop the fake counters on HeroMetricCards; recast them as ordinal-led behavior cards inside precision frames. Apply the new type scale (H1 max `4rem`).
**Scope:** `src/components/landing-v3/landing-content.ts` (Hero copy), `src/components/landing-v3/ArchestimatorLandingPage.tsx` (Hero + HeroMetricCard + ProblemSection functions), `src/components/landing-v3/AnimatedMetricValue.tsx` (remove or repurpose).
**Requirements covered:** REQ-HERO-H1, REQ-HERO-SUBHEAD, REQ-HERO-BELOW-CTA, REQ-HERO-METRIC-CARDS, REQ-PROBLEM-EXPAND, REQ-PROBLEM-CLOSER, REQ-AUDIENCE-BAND (recast).
**Required evidence:** Hero renders with all 7 elements per `07` §2.1; hero mockup remains above the fold; H1 max `4rem`; metric cards use ordinals and behavior proof; Problem section has 3 tight paragraphs; targeted checks green.
**Stop condition:** All 7 hero elements + type-scale compliance + preserved mockup + ordinal metric cards + 3 problem paragraphs land.
**Review gate:** Code review.
**QA gate:** Browser proof for desktop/mobile hero fit because this phase changes above-the-fold layout.

### Phase 2B — Workflow + FeatureChapters rebuild

**Goal ID:** WP-2B
**Objective:** Replace abstract ProductStage placeholders in WorkflowStory and FeatureChapters with real product screenshots framed in precision frames. Add the new 4th FeatureChapter: Private by design (per `07` §2.4, DEC-D). Apply an editorial split layout to feature chapters.
**Scope:** `src/components/landing-v3/ArchestimatorLandingPage.tsx` (WorkflowStory, FeatureChapters functions), `src/components/landing-v3/ProductStage.tsx` (decide whether to keep or remove), new screenshots in `public/landing/screenshots/`.
**Requirements covered:** REQ-WORKFLOW-SCREENSHOTS (4), REQ-FEATURE-CH1-LIBRARY, REQ-FEATURE-CH2-PROPOSAL, REQ-FEATURE-CH3-ACTIVITY, REQ-FEATURE-CH4-PRIVACY-NEW.
**Required evidence:** 4 workflow screenshots captured (estimate tree, library dock, publication viewer, Activity panel); 4 FeatureChapters render with precision-framed screenshot frames; new Privacy chapter renders; alt text on every screenshot; targeted checks green.
**Stop condition:** All 4 screenshots + 4 chapters with precision frames land.
**Review gate:** Code review + founder review of screenshot selection.
**QA gate:** Browser proof only if the implementation changes above-the-fold fit, interaction, or responsive layout.

### Phase 2C — Specialties expand to 7

**Goal ID:** WP-2C
**Objective:** Expand the specialties array from 3 to 7 (per `06` §4.8, DEC-C). Each new specialty gets a directed message + a real screenshot inside a precision-framed panel. Tabs become small pill chips.
**Scope:** `src/components/landing-v3/landing-content.ts` specialties array, `src/components/landing-v3/ArchestimatorLandingPage.tsx` SpecialtiesSection.
**Requirements covered:** REQ-SPECIALTIES-7.
**Required evidence:** 7 specialties render; each panel uses a precision frame; tabs are pill-shaped; mobile horizontal-scroll works; targeted checks green.
**Stop condition:** All 7 specialties with precision-framed panels land.
**Review gate:** Code review.
**QA gate:** Responsive browser proof because this phase changes mobile tab/card behavior.

---

## 5. Phase 3 — Supporting page reframes (parallel after 2B)

Four phases that can run concurrently. Each touches a different route.

### Phase 3A — /pricing reframe

**Goal ID:** WP-3A
**Objective:** Reframe /pricing per `07` §3.1. Drop "hypothesis" + "being validated" + "founding-member rate" from the page top. Move validation framing to lower section.
**Scope:** `src/app/pricing/page.tsx`.
**Requirements covered:** REQ-PRICING-META, REQ-PRICING-HERO, REQ-PRICING-CEMENT-ANCHOR, REQ-PRICING-TIER-SHAPE, REQ-PRICING-VALIDATION-MOVE.
**Required evidence:** /pricing metadata + hero + cement anchor + tier shape reframed; "How we set the price" section rendered lower; targeted checks green.
**Stop condition:** All reframes land.
**Review gate:** Code review + founder review (founder owns pricing language).
**QA gate:** Static/DOM check unless route layout changes require browser proof.

### Phase 3B — /features reframe

**Goal ID:** WP-3B
**Objective:** Reframe /features per `07` §3.2. Drop the dedicated AI section. Reorganize Claims Ledger rendering so Live leads and NotUs collapses to footer.
**Scope:** `src/app/features/page.tsx`, `src/components/landing/claims-ledger/{claims-data.ts,ClaimsLedger.tsx,ClaimRow.tsx}`.
**Requirements covered:** REQ-FEATURES-META, REQ-FEATURES-HERO, REQ-FEATURES-LEDGER-ORDER, REQ-FEATURES-AI-SECTION-DROP.
**Required evidence:** /features metadata + hero reframed; Claims Ledger renders Live dominant + NotUs collapsed; AI section removed; targeted DOM test on ClaimsLedger green.
**Stop condition:** All reframes land.
**Review gate:** Code review.
**QA gate:** DOM test on ClaimsLedger; browser proof only for interaction or responsive layout changes.

### Phase 3C — /about reframe

**Goal ID:** WP-3C
**Objective:** Reframe /about per `07` §3.3. Drop "new company". Replace empty founder slot with real block (or existing one-line + remove caption per OPEN-DEC-004). Reduce limitations from 6 to 3.
**Scope:** `src/app/about/page.tsx`.
**Requirements covered:** REQ-ABOUT-META, REQ-ABOUT-HERO, REQ-ABOUT-INTRO, REQ-ABOUT-FOUNDER (OPEN-DEC-004), REQ-ABOUT-LIMITATIONS.
**Required evidence:** /about reframed; founder block resolved per OPEN-DEC-004 or default; limitations reduced; targeted checks green.
**Stop condition:** All reframes land.
**Review gate:** Code review + founder review (founder supplies bio content for OPEN-DEC-004).
**QA gate:** Static/DOM check unless route layout changes require browser proof.

### Phase 3D — /contact reframe

**Goal ID:** WP-3D
**Objective:** Reframe /contact per `07` §3.4. Drop "talk to the founder" title. Drop "design partners" + "no payment or commitment" lead. Add dual CTA.
**Scope:** `src/app/contact/page.tsx`.
**Requirements covered:** REQ-CONTACT-META, REQ-CONTACT-HERO, REQ-CONTACT-DESIGN-PARTNERS, REQ-CONTACT-DUAL-CTA.
**Required evidence:** /contact reframed; dual CTA renders; targeted checks green.
**Stop condition:** All reframes land.
**Review gate:** Code review.
**QA gate:** Static/DOM check unless route layout changes require browser proof.

---

## 6. Phase 4 — Homepage proof rebuild + close

### Phase 4A — Proof section rebuild + FAQ replace

**Goal ID:** WP-4A
**Objective:** Rebuild ProofSection per `07` §2.8 and `07` §3.2: 4 real screenshots in an asymmetrical bento grid, each inside a precision frame, plus the Cloudflare/Better Auth/R10 trust line. Replace 5 FAQ softballs with 5 buyer-journey Q&As per `06` §4.10; use clean hairline-divided accordion styling.
**Scope:** `src/components/landing-v3/ArchestimatorLandingPage.tsx` (ProofSection + FaqSection), `src/components/landing-v3/landing-content.ts` (productProof + faqs arrays).
**Requirements covered:** REQ-PROOF-REBUILD, REQ-PROOF-COMPANY-GATE, REQ-FAQ-REPLACE.
**Required evidence:** Proof section renders 4 precision-framed screenshot cards in bento grid + Cloudflare line; FAQ renders 5 new Q&As with hairline accordion styling; schema.org FAQPage JSON-LD preserved; targeted checks green.
**Stop condition:** Both sections rebuilt with precision frames and hairline accordion styling.
**Review gate:** Code review.
**QA gate:** DOM test on FAQ JSON-LD plus browser proof for screenshot grid layout.

### Phase 4B — Final CTA + Comparison tighten

**Goal ID:** WP-4B
**Objective:** Reframe FinalCta per `07` §2.10. Tighten Comparison rows per `07` §2.7 (each Archestimator row links to a Live feature).
**Scope:** `src/components/landing-v3/ArchestimatorLandingPage.tsx` (FinalCta + ComparisonSection), `src/components/landing-v3/landing-content.ts` (comparisonRows).
**Requirements covered:** REQ-FINAL-CTA, REQ-COMPARISON-LINKS.
**Required evidence:** FinalCta renders new H2 + body + dual CTA; Comparison rows link to /features anchors; targeted checks green.
**Stop condition:** Both sections land.
**Review gate:** Code review.
**QA gate:** Link check plus browser proof only if layout changes require it.

---

## 7. Phase 5 — Visual refresh pass

**Goal ID:** WP-5
**Objective:** Apply Phase 2-4 visual learning back into DESIGN.md (landing-tokens section). Reconcile any token drift. Confirm `bun run lint:design-system` is green.
**Scope:** `DESIGN.md`, `src/components/landing-v3/landing-v3.module.css`, `src/app/globals.css` (landing-only layers).
**Requirements covered:** REQ-DESIGN-TOKENS-DOC.
**Required evidence:** DESIGN.md landing-tokens section added; design-system lint green; visual review performed only if implementation changed visual source.
**Stop condition:** Token doc + lint green.
**Review gate:** Founder review of DESIGN.md additions (DESIGN.md is alpha-stage, founder owns).
**QA gate:** `bun run lint:design-system`; visual QA only for changed visual implementation.

---

## 8. Phase 6 — A/B test + analytics instrumentation + measurement

**Goal ID:** WP-6
**Objective:** Add an A/B experiment variant B for the new hero CTA. Wire analytics events for hero CTA click, final CTA click, section scroll depth, FAQ expand, screenshot engagement. Define the measurement plan and the success criteria.
**Scope:** `src/components/landing/ABExperimentProvider.tsx`, `src/components/landing/LandingAnalyticsLoader.tsx`, `src/components/landing-v3/landing-content.ts` (variant B strings).
**Requirements covered:** REQ-AB-VARIANT-B, REQ-ANALYTICS-EVENTS, REQ-MEASUREMENT-PLAN.
**Required evidence:** A/B variant B wired; analytics events fire on the 5 surfaces; measurement plan doc; targeted analytics smoke green.
**Stop condition:** All 3 elements land.
**Review gate:** Founder review of measurement plan.
**QA gate:** Analytics smoke test; browser proof where event dispatch needs a real page.

---

## 9. React/Next best-practice review gate (applies to every phase)

Per `Creating-Plan-Prompt.md` §4A. Every phase must:

- Default to Server Components. Justify every new `"use client"` boundary.
- The current `"use client"` surfaces in landing-v3 are: `LandingShellClient`, `ABExperimentProvider`, `HeroMountMotion`, `HeroImageZoom`, `AnimatedMetricValue`, `HeroEstimateWorkspaceMockup`, `ClarityScript`, `CloudflareWebAnalytics`, `ContactForm`, `CookieConsentBanner`, scroll-reveal handlers. New client boundaries must be justified.
- Server-only data (auth state via `getLandingAuthState`) stays out of client bundles.
- TanStack Query is NOT introduced on the public surface (it's an authenticated-app concern).
- URL state semantics: `#workflow`, `#specialties`, `#proof`, `#faq` anchors must reproduce the same visible state on reload/share/back-forward.
- Images: hero uses `priority`; below-the-fold uses lazy loading.
- Fonts: `next/font` already configured per DESIGN.md — no changes.
- Metadata: `buildLandingMetadata` consistently used.

---

## 10. Stop conditions (per phase)

Each phase stops when:
- All listed requirements are `proven` or `deferred_with_rationale`.
- The targeted validation listed for the phase exits 0.
- `bun run build` exits 0 only for release gates or changes that could affect build output.
- Browser proof passes only when the phase changes interaction, responsive layout, or above-the-fold visual composition.
- Code review approved.

---

## 11. Blocker conditions

| Phase | Blocker | Resolution |
|---|---|---|
| Phase 0 | Founder rejects an OPEN-DEC | Re-scope plan or retire |
| Phase 1A | A banned phrase cannot be removed without recasting canon | Escalate as new OPEN-DEC |
| Phase 1B | `/signup` flow does not support the chosen CTA copy | Fall back to OPEN-DEC-005 default; or extend `/signup` first |
| Phase 2B | Real screenshots would expose sensitive data | Use seed data only (`data/local/seed.json`); redact in image editor if needed |
| Phase 3B | Claims Ledger reorganization breaks `claims-matrix-check.mjs` | Update the gate to match the new rendering |
| Phase 6 | Analytics instrumentation exceeds Cloudflare Workers free-tier limits | Stay on free-tier per `MASTER` cost posture; defer analytics |

---

## 12. Post-implementation closeout

After Phase 6:
- Reflect approved recasts back into `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` §0 (canon) and §10.2 (voice principles, if recast).
- Append a closeout entry to `.ai/10_state/current-state.md`.
- Mark this plan pack `IMPLEMENTATION-READY` → `implemented` in `17_FINAL_READINESS_REVIEW.md`.
- Run final `bun run validate` + `bun run build` + `bun run test:e2e` full gate.
- Optional: write a `.ai/13_research/brand-and-landing-page-post-impl-review-YYYY-MM-DD.md` retrospective.
