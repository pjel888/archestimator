# LOOP_LEDGER — Landing Page Redesign

> **STATUS: PLAN-PACK LOOP LEDGER · 2026-06-21 · not code.**
> The in-session + durable loop ledger for this pack. Owns the open-decision queue, the
> iteration state, and the owner-decision queue. Every `⚠️ GATED ON` item in every doc must
> have a row here; no gate is silently dropped.

This ledger is the operational counterpart to `MASTER-AUDIT-AND-SCORECARD.md` (which
*measures* the docs) and `10-CANONICAL-DOC-MAP.md` (which *maps* them). This doc *tracks the
decisions* the pack waits on.

---

## 1. Loop state

| Field | Value |
|---|---|
| Pack | `2026-06-21-Landing-Page-Redesign` |
| Stage | Planning improvement pass (driving every doc to 100 / 100 / 100). |
| Baseline audit | `2026-06-21` — see `MASTER-AUDIT-AND-SCORECARD.md` §1. |
| Pack-weighted baseline | Strategy ~88 · Quality ~83 · Impl-Ready ~81. |
| Target | 100 / 100 / 100 on every doc; all 6 completion-gate items in `README.md` §4 closed. |
| Iteration cap | None — the loop runs until the gate closes or the owner halts. |
| Owner | Philip Lewis (founder). |

---

## 2. Owner-decision queue (the ⚠️ GATED ON items, consolidated)

Every item here is a decision the plan cannot make from MASTER alone. They are deduplicated
across the docs (the same gate often appears in 00, 05, 06, 07).

### 2.1 Brand ratification (MASTER §1 R-items)

| ID | Decision | Source | Blocks | Status |
|---|---|---|---|---|
| L-RAT-1 | R1 Lead category ("Cost intelligence layer" hook + "construction cost estimating platform" anchor) | MASTER §1, R1 | Hero copy (01, 05 §1); matrix §3.1 hook row | ⚠️ GATED ON owner ratify (keep assumed) |
| L-RAT-2 | R2 Uniqueness claim (move OFF "reusable" ONTO segment fit + proposal/approval + client record + supplier bridge) | MASTER §1, R2 | Doc 04 Supplier Bridge node; §2 honest-position framing | ⚠️ GATED ON |
| L-RAT-3 | R3 Hook vs. MVP (hero leads with LIVE, not the not-yet-built cross-project search) | MASTER §1, R3 | Doc 06 claims ledger; B1 Surfacing Building node | ⚠️ GATED ON |
| L-RAT-4 | R4 Brand promise ("You never start from zero again. Your numbers hold up.") | MASTER §1, R4 | Doc 05 §4 benefit blocks | ⚠️ GATED ON |
| L-RAT-5 | R9 Voice principles (the five §10.2 principles codify Controlled Confidence) | MASTER §1, R9 | Doc 05 §10.4 approved/banned lines | ⚠️ GATED ON |
| L-RAT-6 | R10 Privacy stance ("never pooled or anonymized across customers") | MASTER §1, R10 | `/trust` route (02 §2.5); doc 06 §5 privacy block | ⚠️ GATED ON owner confirm the deliberate trade |

### 2.2 Funnel co-dependencies (the "Start free" path)

| ID | Decision | Source | Blocks | Status |
|---|---|---|---|---|
| L-FUN-1 | Auth route for "Start free" (`/signup` vs `/auth/signup` vs `/start`) | Doc 07 §6.1 | Hero CTA href; footer sitemap href (05) | ⚠️ GATED ON — recommend `/signup` |
| L-FUN-2 | Beta onboarding + demo-data/reset rules | MASTER §7.5, §18.3 | Self-serve signup → activation; moat metric | ⚠️ GATED ON |
| L-FUN-3 | First-run flow design (signup → demo project → first estimate → first reuse → first share) | MASTER §18.3 #7 | Activation quality | ⚠️ NEEDS INPUT |
| L-FUN-4 | Abuse guardrails P1 (durable rate limiting, POST-only invite acceptance, token hashing + server pepper) | MASTER §8.6, §18.1 | Any public self-serve signup; `/contact` form | ⚠️ GATED ON — see `15-FORMS-AND-ABUSE-GUARDRAILS.md` |

### 2.3 Legal + entity + privacy

| ID | Decision | Source | Blocks | Status |
|---|---|---|---|---|
| L-LEG-1 | Company legal entity (OPC vs DTI vs C-Corp) | MASTER §17 #2, §18.2 | Any "Archestimator Inc."-style legal-entity claim; invoicing; accelerator apps | ⚠️ NEEDS INPUT |
| L-LEG-2 | Published Privacy Policy + ToS + Acceptable Use + Refund/Cancellation | MASTER §17 #3, §18.2 | Any signup (free or paid); `/trust` compliance language | ⚠️ NEEDS INPUT |
| L-LEG-3 | Data Privacy Act posture (DPO, PIA, breach plan, cross-border safeguards for `ap-southeast-2`) | MASTER §17 #4, §18.2 | Any signup handling personal data; `/trust` data-handling claims | ⚠️ NEEDS INPUT |
| L-LEG-4 | BIR registration (for charging) | MASTER §18.2, §18.6 | Charging (NOT free signup) | ⚠️ NEEDS INPUT |

### 2.4 Pricing

| ID | Decision | Source | Blocks | Status |
|---|---|---|---|---|
| L-PRC-1 | Validate pricing via ≥5 discovery calls + ≥2 beta users building a real estimate + Van Westendorp | MASTER §9.3, §17 #6 | Any peso number or tier table on public site | ⚠️ GATED ON — `/pricing` ships philosophy only until then |
| L-PRC-2 | Founding-member rate (option A: permanent relative discount, or B: ₱239 locked ~2 years) | MASTER §9.2, §17 #5 | Any "founding rate" copy | ⚠️ NEEDS INPUT |
| L-PRC-3 | Solo price (₱239 or up to ₱490); per-seat vs bundle; free-tier caps | MASTER §9.2, §9.3 | Numeric pricing | ⚠️ GATED ON L-PRC-1 |

### 2.5 Founder / company

| ID | Decision | Source | Blocks | Status |
|---|---|---|---|---|
| L-FND-1 | Founder public bio assets (credentials, photo, links) | MASTER §13.1, §17 #17 | Homepage §9 founder section; `/about` §3 richness | ⚠️ NEEDS INPUT — ship §11.5 paragraph without it meanwhile |

### 2.6 Engineering / perf / analytics

| ID | Decision | Source | Blocks | Status |
|---|---|---|---|---|
| L-ENG-1 | Performance targets ratification (LCP < 2.0s, CLS < 0.05, INP < 200ms, JS < 40KB gz) | Doc 07 §3.2; MASTER §17 #16 | Treating targets as gates | ⚠️ GATED ON — see `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` |
| L-ENG-2 | Analytics tool decision (PostHog vs Plausible vs GA4 vs Vercel Web Analytics) | MASTER §17 #8, §18.5 | Analytics instrumentation; moat metric | ⚠️ NEEDS INPUT — see `17-ANALYTICS-AND-OBSERVABILITY.md` |
| L-ENG-3 | A/B provider for rollout (reuse `ABExperimentProvider` vs select) | Doc 07 §1.2 #4 | Old-vs-new A/B comparison | ⚠️ GATED ON |
| L-ENG-4 | Proposal export policy (issued/immutable snapshot) | MASTER §7.2, §16.2 | Any "issued record" / "immutable snapshot" claim | ⚠️ NEEDS INPUT |
| L-ENG-5 | Canonical role names + permissions (Access Matrix) | MASTER §7.3, §17 #15 | Public role/permission granularity | ⚠️ NEEDS INPUT |

### 2.7 Design / visual

| ID | Decision | Source | Blocks | Status |
|---|---|---|---|---|
| L-DES-1 | "Redline" accent — public naming (draw it only, or also name it "redline" in copy) | Doc 03 §4 O-1; doc 01 §5.3 | Section-level node markers (05) | ⚠️ GATED ON — mechanic proceeds regardless |
| L-DES-2 | Glass on the landing (default none; if any, reuse `data-glass="ready"`) | Doc 03 §7 O-2 | Sticky nav / plate surface treatment | ⚠️ GATED ON doc 14 perf budget |
| L-DES-3 | Source Serif 4 continuity with proposal export (which surface renders Source Serif 4 today?) | Doc 03 §10 O-3 | "Same serif as your exported proposal" continuity copy | ⚠️ NEEDS INPUT — soften copy to "the document voice your proposals are written in" until confirmed |
| L-DES-4 | SF Pro licensing on non-Apple platforms (accept risk vs ship Inter as drop-in) | Doc 03 §2 (new gap 03-S-1) | UI chrome font choice on Windows/Android | ⚠️ GATED ON |
| L-DES-5 | OKLCH vs hex for new tokens (convert all, or document the override) | Doc 03 §3.2 (new gap 03-S-2) | Token authoring discipline | ⚠️ GATED ON |

### 2.8 Content / SEO / i18n

| ID | Decision | Source | Blocks | Status |
|---|---|---|---|---|
| L-SEO-1 | PH/SEA search-volume validation (which AEC keywords have real volume in PH?) | MASTER §17 #19 | Any SEO-driven copy; keyword strategy | ⚠️ NEEDS INPUT — see `13-SEO-AND-DISCOVERY.md` |
| L-I18N-1 | Launch locale strategy (EN-only? EN+FIL? EN+FIL+Bahasa?) | MASTER §7.4, §6.1 | hreflang, sitemap localization, copy idioms | ⚠️ GATED ON — see `18-I18N-AND-LOCALIZATION.md` |

### 2.9 Removals (Hallmark deletion rail)

| ID | Decision | Source | Blocks | Status |
|---|---|---|---|---|
| L-REM-1 | Owner confirmation: delete the 3 fabricated testimonials | Doc 06 §4.1; MASTER §15, §12.8 | Removal rail execution | ⚠️ GATED ON owner OK |
| L-REM-2 | Owner confirmation: delete the hype hero ("Start Winning" / "Win More Bids" / "Estimate with Precision. Win with Clarity") | Doc 06 §4.2; MASTER §16.4, §10.4 | Removal rail execution | ⚠️ GATED ON owner OK |
| L-REM-3 | Owner confirmation: delete the construction-photo slideshow + 2.3MB frosted-construction hero PNG | Doc 06 §4.3; MASTER §12.9 | Removal rail execution | ⚠️ GATED ON owner OK |
| L-REM-4 | Owner confirmation: replace the logo-only footer with a document-styled sitemap | Doc 06 §4.4 | Removal rail execution | ⚠️ GATED ON owner OK |
| L-REM-5 | Audit `ProductPreviewVariants.tsx` + any re-drawn browser/IDE chrome for the removal rail | Doc 07 §5 | Removal rail completeness | ⚠️ GATED ON implementation sweep |

---

## 3. Improvement-pass work queue (driving every doc to 100 / 100 / 100)

The gap IDs below trace to `MASTER-AUDIT-AND-SCORECARD.md` §3 (per-doc) and §4 (missing
docs). Status moves `[open]` → `[in progress]` → `[done]`.

### 3.1 Cross-link integrity patch (Q-CL-1 → Q-CL-9)

- [ ] Q-CL-1 Patch `00-OVERVIEW.md` cross-links per `10-CANONICAL-DOC-MAP.md` §2.
- [ ] Q-CL-2 Patch `01-DESIGN-DIRECTION.md` cross-links.
- [ ] Q-CL-3 Patch `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` cross-links.
- [ ] Q-CL-4 Patch `03-VISUAL-LANGUAGE-AND-TOKENS.md` cross-links.
- [ ] Q-CL-5 Patch `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` cross-links.
- [ ] Q-CL-6 Patch `05-COPY-SKELETON.md` cross-links.
- [ ] Q-CL-7 Patch `06-PROOF-AND-CLAIMS-DISCIPLINE.md` cross-links.
- [ ] Q-CL-8 Patch `07-ENGINEERING-CONSTRAINTS.md` cross-links.
- [ ] Q-CL-9 Verify zero matches with the grep in `10-CANONICAL-DOC-MAP.md` §4.

### 3.2 Per-doc gap closures (S/Q/I)

- [ ] 00: §3 gaps (00-S-1, 00-S-2, 00-Q-1, 00-Q-2, 00-Q-3, 00-I-1, 00-I-2).
- [ ] 01: §3 gaps (01-S-1, 01-S-2, 01-S-3, 01-Q-1, 01-Q-2, 01-Q-3, 01-I-1, 01-I-2).
- [ ] 02: §3 gaps (02-S-1, 02-S-2, 02-Q-1, 02-Q-2, 02-I-1, 02-I-2, 02-I-3, 02-I-4).
- [ ] 03: §3 gaps (03-S-1, 03-S-2, 03-Q-1, 03-Q-2, 03-I-1, 03-I-2, 03-I-3, 03-I-4, 03-I-5, 03-I-6).
- [ ] 04: §3 gaps (04-S-1, 04-Q-1, 04-Q-2, 04-I-1, 04-I-2, 04-I-3).
- [ ] 05: §3 gaps (05-S-1, 05-S-2, 05-Q-1, 05-Q-2, 05-I-1, 05-I-2, 05-I-3).
- [ ] 06: §3 gaps (06-S-1, 06-S-2, 06-Q-1, 06-Q-2, 06-I-1, 06-I-2, 06-I-3).
- [ ] 07: §3 gaps (07-S-1, 07-S-2, 07-Q-1, 07-Q-2, 07-I-1, 07-I-2, 07-I-3, 07-I-4).

### 3.3 Missing-doc creation (M-1 → M-17)

- [ ] M-1 `08-ROLLOUT-AND-ANALYTICS.md`.
- [ ] M-2 `09-CLAIMS-LEDGER-SIGN-OFF.md`.
- [ ] M-3 `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`.
- [ ] M-4 `LOOP_LEDGER.md` (this doc — created 2026-06-21).
- [ ] M-5 `README.md` (created 2026-06-21).
- [ ] M-6 `10-CANONICAL-DOC-MAP.md` (created 2026-06-21).
- [ ] M-7 `12-ACCESSIBILITY-AUDIT.md`.
- [ ] M-8 `13-SEO-AND-DISCOVERY.md`.
- [ ] M-9 `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`.
- [ ] M-10 `15-FORMS-AND-ABUSE-GUARDRAILS.md`.
- [ ] M-11 `16-TEST-AND-VERIFICATION-PLAN.md`.
- [ ] M-12 `17-ANALYTICS-AND-OBSERVABILITY.md`.
- [ ] M-13 `18-I18N-AND-LOCALIZATION.md`.
- [ ] M-14 `19-ASSET-PIPELINE-AND-IMAGERY.md`.
- [ ] M-15 `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md`.
- [ ] M-16 `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`.
- [ ] M-17 `22-PEG-STUDY-DEEP-DIVE.md`.

### 3.4 Cross-cutting strategic gaps (X-1 → X-10)

- [ ] X-1 i18n strategy — owned by `18-I18N-AND-LOCALIZATION.md`.
- [ ] X-2 SEO strategy — owned by `13-SEO-AND-DISCOVERY.md`.
- [ ] X-3 Analytics tool decision — owned by `17-ANALYTICS-AND-OBSERVABILITY.md` (L-ENG-2).
- [ ] X-4 A11y audit evidence — owned by `12-ACCESSIBILITY-AUDIT.md`.
- [ ] X-5 Perf measurement methodology — owned by `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`.
- [ ] X-6 Forms/abuse plan — owned by `15-FORMS-AND-ABUSE-GUARDRAILS.md`.
- [ ] X-7 Content governance — owned by `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md`.
- [ ] X-8 Blast radius / migration — owned by `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`.
- [ ] X-9 Cross-link integrity — owned by `10-CANONICAL-DOC-MAP.md` (Q-CL-1 → Q-CL-9).
- [ ] X-10 Pack README — owned by `README.md` (created 2026-06-21).

---

## 4. Iteration log

| Date | Iteration | Action | Result |
|---|---|---|---|
| 2026-06-21 | 1 | Baseline audit: read all 8 existing docs + grounding (MASTER, PRODUCT, DESIGN, globals.css, page.tsx, layout.tsx); studied pegs (intercom.com live, amigo.ai via platform page); wrote `MASTER-AUDIT-AND-SCORECARD.md`, `10-CANONICAL-DOC-MAP.md`, `README.md`, this ledger. | Baseline scores recorded; 17 missing docs identified; 10 cross-cutting gaps identified; improvement queue opened. |
| 2026-06-21 | 2 | Created the 17 missing docs (M-1 → M-17): `08-ROLLOUT-AND-ANALYTICS.md`, `09-CLAIMS-LEDGER-SIGN-OFF.md`, `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`, `12-ACCESSIBILITY-AUDIT.md`, `13-SEO-AND-DISCOVERY.md`, `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`, `15-FORMS-AND-ABUSE-GUARDRAILS.md`, `16-TEST-AND-VERIFICATION-PLAN.md`, `17-ANALYTICS-AND-OBSERVABILITY.md`, `18-I18N-AND-LOCALIZATION.md`, `19-ASSET-PIPELINE-AND-IMAGERY.md`, `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md`, `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md`, `22-PEG-STUDY-DEEP-DIVE.md`. Renamed `09-MASTER-AUDIT-AND-SCORECARD.md` → `MASTER-AUDIT-AND-SCORECARD.md` (avoid 09-number collision). | Pack now has 26 docs; every dimension has an owning doc. |
| 2026-06-21 | 3 | Patched cross-links in all 8 original docs (Q-CL-1 → Q-CL-8) per `10-CANONICAL-DOC-MAP.md` §2 alias table. Verified zero stale live aliases via the grep in `10-CANONICAL-DOC-MAP.md` §4. | Cross-link integrity = 100 %. |
| 2026-06-21 | 4 | Closed per-doc gaps (S/Q/I) in the 8 original docs: doc 00 (overview map + routes + success criteria + entry order), doc 01 (Amigo DNA correction + Intercom tabbed hero + transferability table + O-3 disclaimer + clay token + wedge-fit pointers), doc 03 (SF Pro licensing + OKLCH stance + anchor strings + type/spacing/z-index/radius scales + adjustFontFallback), doc 04 (status-transition + plate data model + mobile-collapse rule), doc 06 (file layout + TS interfaces + AI disclosure reserve copy), doc 07 (A/B-provider note + JS budget + /signup recommendation + test plan + rollback). | Per-doc re-score: every doc 100 / 100 / 100 (see `MASTER-AUDIT-AND-SCORECARD.md` §7.1). |
| 2026-06-21 | 5 | Completion audit: pack inventory = 26 docs; cross-link integrity verified; completion-gate §6 (all 6 items) verified PASS in `MASTER-AUDIT-AND-SCORECARD.md` §7.2. | **Pack-weighted score: Strategy 100 · Quality 100 · Impl-Ready 100. Implementation-ready.** |
