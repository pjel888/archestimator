# LOOP_LEDGER — Landing Page Redesign

> **STATUS: PLAN-PACK LOOP LEDGER · 2026-06-21 · revised 2026-06-22 · not code.**
> The loop ledger for this pack. Owns the open-decision queue, the iteration state, the
> owner-decision queue, and the sign-off log. Every `⚠️ GATED ON` item in every doc must have a
> row here; no gate is silently dropped, and (per D-5) no gate is silently *closed* either.

This ledger is the operational counterpart to `MASTER-AUDIT-AND-SCORECARD.md` (which *measures*
the docs) and `10-CANONICAL-DOC-MAP.md` (which *maps* them). This doc *tracks the decisions* the
pack waits on.

---

## 1. Loop state

| Field | Value |
|---|---|
| Pack | `2026-06-21-Landing-Page-Redesign` (28 markdown docs on disk: 24 numbered + README/LOOP/MASTER audit/MASTER implementation) |
| Stage | Post-pivot honest re-baseline (D-1..D-5 ratified 2026-06-22). |
| Pre-pivot baseline (2026-06-21, independent re-audit) | Strategy ~85 · Quality ~85 · Impl-Ready ~72 (the prior self-claim of 100/100/100 is **recalled — D-5**). |
| Post-pivot honest score (2026-06-22, §4 iter 6) | Strategy ~95 · Quality ~94 · Impl-Ready ~91. |
| Target | **Honest 100 %** on two rubrics (see `README.md` §4): Rubric A (planning-achievable) = 100 % ✅; Rubric B (execution-inclusive) ≈ 91 %, capped by the carried owner gates below (a PASS per D-5, not a fail). |
| Iteration cap | None — the loop runs until the owner halts or every gate is resolved. |
| Owner | Philip Lewis (founder). |

---

## 2. Owner-decision queue (the ⚠️ GATED ON items, consolidated)

Every item here is a decision the plan cannot make from the corpus alone. Deduplicated across
docs. **Status legend:** `⚠️ GATED` = needs owner; `🔁 SUPERSEDED` = closed by a 2026-06-22
decision (kept for the audit trail); `✅ carried` = open but planning-acceptable (does not block
Rubric A).

### 2.1 Brand ratification (corpus §1 R-items)

| ID | Decision | Status |
|---|---|---|
| L-RAT-1..6 | Lead category / uniqueness / hook-vs-MVP / brand promise / voice principles / privacy stance (R1, R2, R3, R4, R9, R10) | ⚠️ GATED — assumed in copy; ratify to lock |

### 2.2 Funnel (the "Start free" path)

| ID | Decision | Status |
|---|---|---|
| L-FUN-1 | Auth route `/signup` vs `/auth/signup` | 🔁 SUPERSEDED by D-2 — `/login` + `/signup` (full-page) ratified 2026-06-22. The route shape is settled; **`/signup` self-serve is still GATED on L-FUN-2** (the page is designed, the on-ramp is not). |
| L-FUN-2 | Beta onboarding + demo-data/reset rules + self-serve on/off | ⚠️ GATED — decides whether "Start free" → `/signup` or → `/login`/`/contact`. The 2-col design (doc 23) is agnostic. |
| L-FUN-3 | First-run flow (signup → demo project → first estimate → first reuse → first share) | ⚠️ NEEDS INPUT |
| L-FUN-4 | Abuse guardrails P1 (Postgres `security_rate_limit_events` rate-limit, POST-only invite, peppered token hashing) | ⚠️ GATED — see `15-FORMS-AND-ABUSE-GUARDRAILS.md` |

### 2.3 Legal + entity + privacy

| ID | Decision | Status |
|---|---|---|
| L-LEG-1 | Company legal entity (OPC/DTI/C-Corp) | ⚠️ NEEDS INPUT |
| L-LEG-2 | Published Privacy Policy + ToS + AUP + Refund/Cancellation | ⚠️ NEEDS INPUT — gates any signup data-handling claim + `/trust` language |
| L-LEG-3 | Data Privacy Act posture (DPO, PIA, breach plan, cross-border for `ap-southeast-2`) | ⚠️ NEEDS INPUT |
| L-LEG-4 | BIR registration (for charging, NOT free signup) | ⚠️ NEEDS INPUT |

### 2.4 Pricing

| ID | Decision | Status |
|---|---|---|
| L-PRC-1 | Validate pricing via ≥5 discovery calls + ≥2 beta builds + Van Westendorp | ⚠️ GATED — `/pricing` ships philosophy only until then |
| L-PRC-2 | Founding-member rate | ⚠️ NEEDS INPUT |
| L-PRC-3 | Solo price / per-seat vs bundle / free-tier caps | ⚠️ GATED on L-PRC-1 |

### 2.5 Founder / company

| ID | Decision | Status |
|---|---|---|
| L-FND-1 | Founder public bio assets (credentials, photo, links) | ⚠️ NEEDS INPUT — ship the §11.5 paragraph without it meanwhile |

### 2.6 Engineering / perf / analytics

| ID | Decision | Status |
|---|---|---|
| L-ENG-1 | Performance targets ratification (LCP < 2.0s, CLS < 0.05, INP < 200ms, JS < 40KB gz) | ⚠️ GATED — see `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` |
| L-ENG-2 | Analytics tool (PostHog vs Plausible vs GA4 vs Vercel Web Analytics) — also blocks the LHCI CI lane | ⚠️ NEEDS INPUT — PostHog recommended in `17-ANALYTICS-AND-OBSERVABILITY.md` |
| L-ENG-3 | Bundle-gate wiring (`analyze` npm script + CI step + budget file) — the `withBundleAnalyzer` wrapper already exists in `next.config.ts:223`; the gate does not | ⚠️ GATED — see `07` §3.6 + `16` §28 |
| L-ENG-4 | Proposal export policy (issued/immutable snapshot) | ⚠️ NEEDS INPUT |
| L-ENG-5 | `adjustFontFallback` values for Doto/Roboto Mono (CLS=0 lab verify) | ⚠️ GATED — starting-guess in `14` §5.1.2 |
| L-ENG-6 | LHCI config path (`lighthouserc.js` — one canonical config; no `.lighthouseci/budget.json` sidecar unless LHCI requires it) | ✅ carried (path decided; CI lane gated on L-ENG-2) |
| L-ENG-7 | Canonical role names + permissions (Access Matrix) | ⚠️ NEEDS INPUT |
| L-EXP-1 | A/B baseline signup CVR + weekly-unique estimate for sample-size recompute | ⚠️ GATED — replaces the erroneous `08` use of L-ENG-4; blocks A/B significance claims, not preview build |

### 2.7 Design / visual

| ID | Decision | Status |
|---|---|---|
| L-DES-1 | "Redline"/accent-rail public naming | ⚠️ GATED — mechanic proceeds regardless |
| L-DES-2 | Glass on the landing | 🔁 SUPERSEDED by D-1 — glass IS the default surface treatment now (warm canvas + `.dashboard-glass`). The gate is now the ≤4-blur perf budget (`14` §4) + the L-A11Y-1 mobile-30fps verify, not "whether to use glass." |
| L-DES-3 | Source Serif 4 continuity with proposal export | 🔁 SUPERSEDED by D-1 — Source Serif 4 DEFERRED (export is `.xlsx`); the continuity claim is aspirational until the export ships serif. |
| L-DES-4 | SF Pro licensing on non-Apple platforms | ⚠️ GATED — inherited from the app (Doto/Mono via next/font sidesteps it for the landing) |
| L-DES-5 | OKLCH vs hex for new tokens | ✅ carried — stance documented in `03` §2 (match existing globals.css hex; convert NEW tokens) |
| L-DES-6 (new) | Doto `adjustFontFallback` CLS=0 lab verification before cutover | ⚠️ GATED (see L-ENG-5) |
| L-DES-7 (new) | Dark-mode story for the landing (the workshop glass has dark variants) | ⚠️ GATED — see `19-ASSET-PIPELINE-AND-IMAGERY.md` |

### 2.8 Content / SEO / i18n

| ID | Decision | Status |
|---|---|---|
| L-SEO-1 | PH/SEA search-volume validation (which AEC keywords have real PH volume?) | ⚠️ NEEDS INPUT — see `13-SEO-AND-DISCOVERY.md` |
| L-I18N-1 | Launch locale strategy (EN-only? EN+FIL? EN+FIL+Bahasa?) | ⚠️ GATED — EN-only recommended; see `18-I18N-AND-LOCALIZATION.md` |

### 2.9 Removals (Hallmark deletion rail)

| ID | Decision | Status |
|---|---|---|
| L-REM-1..4 | Owner OK to delete the fabricated testimonials / hype hero / 2.3MB PNG + slideshow / logo-only footer | ⚠️ GATED — owner OK |
| L-REM-5 | Audit `ProductPreviewVariants.tsx` + re-drawn chrome for the removal rail | ⚠️ GATED — implementation sweep |
| L-REM-6 (new) | Day-31 `/legacy` action (auto-delete / owner reminder / git tag) | ⚠️ GATED — see `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` |

### 2.10 Peg study + claims automation (new 2026-06-22)

| ID | Decision | Status |
|---|---|---|
| L-PEG-1 | Competitive scan of the AEC-estimating segment (substantiate or soften "no competitor has drawn the commercial graph") | ⚠️ GATED — referenced 13× in `22`/`01`; gates that claim as fact vs qualified hypothesis |
| L-PEG-2 | Apply the dashboard bento IA to the landing | ⚠️ GATED |
| L-PEG-3 | Third external peg | ⚠️ GATED (optional) |
| L-PEG-4 | Amigo homepage direct re-fetch (platform page is the load-bearing DNA source; homepage confidence is medium) | ✅ carried — deliberate deferral OR one-line fetch next revision |
| L-CLM-1 | Ship `scripts/claims-matrix-check.mjs` + `scripts/claims-forbidden-sweep.mjs` (the CI gate) | ⚠️ GATED — until then the sign-off gate (doc 09) is a manual checklist |
| L-CLM-2 | `scripts/claims-inventory-normalize.mjs` | ⚠️ GATED |
| L-CLM-3 | Feature Inventory snapshot pipeline (Notion export → checked-in artifact) | ⚠️ GATED |

### 2.11 A11y + CRM (new from doc 23 / doc 12)

| ID | Decision | Status |
|---|---|---|
| L-A11Y-1 | Live 30fps motion-reduction + text-on-glass AA verify on the target mid-range-Android device | ⚠️ GATED — the unautomatable gate; see `12` + `14` |
| L-CRM-1 | Closed-beta waitlist destination (when self-serve is off) | ⚠️ GATED — see `23-AUTH-EXPERIENCE.md` §10 |
| L-VIS-1 | Playwright screenshot-diff baselines at 1280, 768, 414, 375, and 320 widths | ⚠️ GATED — see `16-TEST-AND-VERIFICATION-PLAN.md` §6; blocks visual sign-off, not static planning |
| L-PRIV-1 | Contact / waitlist PII data-flow destination, access, retention, export/deletion, and provider DPA check | ⚠️ GATED — see `15-FORMS-AND-ABUSE-GUARDRAILS.md` §2.4; blocks public forms |
| L-OBS-1 | Minimum monitoring path before analytics tooling closes: Vercel log query, Supabase query, alert destination, daily owner check | ⚠️ GATED — see `17-ANALYTICS-AND-OBSERVABILITY.md` §10 |

---

## 3. Improvement-pass work queue

- [x] Q-CL-1..9 — cross-link integrity patch (all 8 original docs; verified zero stale aliases).
- [x] M-1..17 — the 17 originally-missing docs created (2026-06-21).
- [x] `README` · `LOOP_LEDGER` · `10-CANONICAL-DOC-MAP` · `MASTER-AUDIT-AND-SCORECARD` created.
- [x] **Iter 6 (2026-06-22):** D-1..D-5 pivot — 3 keystone docs rewritten (00, 03, new 23), 20 substance docs upgraded, 5-agent adversarial panel run, `rate_limit`→`security_rate_limit_events` corrected across 14 docs, the 4 meta docs reconciled. **Honest re-score recorded in `MASTER` §7.1.**
- [x] **Iter 7 (2026-06-22):** Codex + five native subagent audit reconciled the execution layer: `MASTER-IMPLEMENTATION-PLAN.md` integrated as the 28th markdown doc, `/newdesign` SEO policy unified, auth/contact reclassified as security-relevant, CTA route-shape vs self-serve gates split, current-codebase checkpoint added, and visual/PII/experiment gates registered.
- [x] **Iter 8 (2026-06-22):** Owner clarified that the landing must introduce the app/brand and include hints of liquid glass. The pack now treats liquid glass as a brand-continuity cue across the first viewport, masthead, hero material panel, commercial graph, claims ledger, CTA, and auth handoff.
- [ ] Owner resolves the ⚠️ GATED items above (none block Rubric A = planning-complete).

---

## 4. Iteration log

| Date | Iteration | Action | Result |
|---|---|---|---|
| 2026-06-21 | 1 | Baseline audit; wrote MASTER, 10-CANONICAL, README, this ledger. | Baseline ~88/83/81 recorded; 17 missing docs + 10 cross-cutting gaps identified. |
| 2026-06-21 | 2–5 | Created the 17 missing docs; patched cross-links; closed the 8-original-doc gaps; **self-scored 100/100/100 (the D-5 defect — recalled in iter 6)**. | Pack had 26 docs; every dimension owned. |
| 2026-06-22 | **6** | Owner directed the **Glass Brand** pivot (D-1) + full-page 2-col auth (D-2); ratified D-3/D-4/**D-5 (honest scoring)**. Broad multi-agent revision pass: rewrote 00/03/new-23, upgraded 01/02/04/05/06/07/08/09/11–22; 5-agent adversarial panel re-audited (brand-fidelity 88, coherence 62→fixed in meta pass, impl-readiness ~88, must-haves all PASS, meta-honesty 38→fixed). Corrected `rate_limit`→`security_rate_limit_events` across 14 docs (real table verified: migration `20260601003000`). Reconciled the 4 meta docs (README, 10-CANONICAL, MASTER §7, this doc). | **Honest re-score: Strategy ~95 · Quality ~94 · Impl-Ready ~91. Rubric A = 100 % (planning-complete); Rubric B ≈ 91 % (capped by carried owner gates). The recalled 100/100/100 is retired.** |
| 2026-06-22 | **7** | Codex continuation ran five read-only specialist lanes (product, design, feasibility, security, scope) plus local/web research and patched the packet against confidence-100 contradictions. | `/newdesign` is consistently `noindex`; L-FUN-1 route shape is resolved while L-FUN-2 self-serve remains open; public auth/contact now block on rate-limit/PII contracts; `MASTER-IMPLEMENTATION-PLAN.md` is integrated; remaining gates are explicit owner/provider/verification gates. |
| 2026-06-22 | **8** | Owner explicitly required liquid-glass hints and landing-as-app/brand introduction. | `00`, `01`, `03`, `05`, `11`, and `16` now make liquid-glass continuity a contract; design-qa/Visual Ralph remain implementation-time evidence gates because no rendered landing exists in this docs-only pass. |

---

## 5. Sign-off log

Template row (the shape `09-CLAIMS-LEDGER-SIGN-OFF.md` §3.2 step 9 references). No rows yet —
the pack is planning-complete, not signed off for launch.

| Date | Reviewer | Inventory snapshot ref | Public-matrix ref | Result | Method | Notes |
|---|---|---|---|---|---|---|
| _(none yet)_ | _(owner)_ | `.evidence/feature-inventory-<date>.md` | `06-PROOF` §3 | _(pass/fail)_ | forbidden-sweep + matrix-reconcile + axe + LHCI + bundle | _()_ |
