# 17 — Final Readiness Review

**Plan:** Brand & Landing Page (2026-07-05)
**Verification mode:** `emulated` (lead author; no independent verifier available)
**Caps applied:** Per `Multi-Agent-Execution-Directive.md` §2, `verification_mode: emulated` caps readiness at 97. Brand voice recasts are not high-blast-radius in the exhaustive sense but touch the founder's canon, so package status is `CONDITIONALLY READY` pending founder sign-off on the OPEN-DECs.

---

## 0. 2026-07-06 continuation readiness correction

**Revised status:** `REVISED CONDITIONALLY READY`.

This continuation pass improves the plan, not the app source. It supersedes the earlier warm editorial-luxury / large-radius direction and the "all 12 OPEN-DECs block implementation" posture.

New evidence added:

- `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` §0 preserves the hero estimate-sheet mockup and defines the corrected visual thesis.
- `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` §0 replaces the earlier warm-commercial/Double-Bezel default with Precision Editorial.
- `19_COPY_DEPLOYABLE_PACK.md` §0 gives the shorter hero copy, CTA defaults, and copy constraints.
- `11_IMPLEMENTATION_PLAN.md` §0 separates safe defaults from true founder blockers and makes validation proportional.
- `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` §0 prunes the decision gates.
- `04_REQUIREMENTS_SPECIFICATION.md` §0 and `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` §0 trace the new hero-preservation, copy-fit, precision-design, no-fake-proof, and proportional-validation requirements.

Current true blockers:

| Blocker | Default |
|---|---|
| CTA access model | "Request access" until `/signup` is verified self-serve |
| Founder bio/photo | Existing one-line founder rationale; remove "bio coming" |
| Public pricing numbers | No numeric prices in this plan |
| Proof screenshot selection | Use seed/demo screenshots |
| Visual archetype override | Precision Editorial |

Verification for this continuation is docs-only. Browser, Playwright, visual QA, and source tests are deferred to implementation phases where they prove a real layout or interaction claim.

---

## 1. Plan status

### `REVISED CONDITIONALLY READY`

The plan is **ready to enter implementation planning** for the safe-default slices in `11` §0. All implementation should preserve the hero estimate-sheet mockup above the fold, use the Precision Editorial defaults, and block only on the true owner decisions listed in §0.

---

## 2. Completion audit — requirement-by-requirement

Per `Multi-Agent-Execution-Directive.md` §14.

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Audit the current landing page — list the good and the bad | ✅ `proven` | `03_SOURCE_AND_CODEBASE_AUDIT.md` §1 (section-by-section), §2 (altitude graph), §7 (good/bad/missing summary) |
| 2 | Nail down the product | ✅ `proven` | `08_PRODUCT_DEFINITION_AND_FEATURES.md` §1-2 (what it IS / IS NOT), §3 (Live matrix L1-L11) |
| 3 | List down our features and be able to sell it | ✅ `proven` | `08` §3-5 (Live/Building/Planned matrix), §6 (competitive wedge), §7 (7-persona map), §11 (canonical brand strings) |
| 4 | Improve branding | ✅ `proven` | `06_BRAND_AND_COPY_DIRECTION.md` (5 voice principles reanchored), `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` (tokens + screenshots + motion), `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` (high-end visual direction) |
| 4a | Audit landing page visual design and fix font/button/nav issues | ✅ `proven` | `20` §0 and §3 (corrected visual thesis plus line-level audit of typography, buttons, nav, borders, motion, spacing) |
| 5 | No beta wording and all | ✅ `proven` (planning) | `06` §3 (anti-beta-wording policy: 23 banned phrases + replacement patterns), `03` §3 (line-level inventory of every banned phrase) |
| 6 | Present as legitimate app | ✅ `proven` | `06` §3.4 (required-on-marketing-surfaces list), `07` §1 (target altitude graph), `11` Phase 1A lint pass |
| 7 | Hero section preserved (user said it's good) | ✅ `proven` | `20` §0 and `04` §0 require `HeroEstimateWorkspaceMockup` to remain the above-the-fold proof object |
| 8 | Plan comprehensively | ✅ `proven` | 20 numbered docs + README + 00; phase plan in `11`; traceability matrix in `16`; risk register in `14`; decisions in `15`; design audit in `20` |
| 9 | Output to `.ai/03_plans/2026-07-05-Brand-And-Landing-Page/` | ✅ `proven` | All plan files at this path |
| 10 | Use Creating-Plan-Prompt.md template | ✅ `proven` | Plan profile = `standard` per `02` §3; numbered doc structure per `Creating-Plan-Prompt.md` §9 |
| 11 | Use Multi-Agent-Execution-Directive.md | ✅ `proven` | Lane map in `00` §2; coordination ledger in `00` §3; verification mode recorded; concurrent safety in `00` §6 |
| 12 | Planning task only, no implementation | ✅ `proven` | No source code, tests, migrations, package, or provider state touched. All writes were `.ai/03_plans/2026-07-05-Brand-And-Landing-Page/*.md`. |

**Audit verdict:** 13 of 13 explicit requirements `proven` for the planning pass.

---

## 3. Residual gates (what's still open)

### 3.1 True founder gates

| Gate | Status | Blocks |
|---|---|---|
| CTA access model | ⚠️ Defaulted | CTA labels/hrefs only; default "Request access" |
| Founder bio/photo | ⚠️ Defaulted | Final `/about` founder block content only |
| Public pricing numbers | ⚠️ Defaulted | Numeric pricing publication only |
| Proof screenshot selection | ⚠️ Defaulted | Final proof assets only |
| Visual archetype override | ⚠️ Defaulted | Only blocks if founder rejects Precision Editorial without choosing an alternative |

**Note:** Safe-default slices can proceed under `11` §0. Older OPEN-DECs remain useful review notes, but they are no longer all implementation blockers.

### 3.2 Verification mode cap

| Gate | Status | Impact |
|---|---|---|
| Independent final verifier | ⛔ Unavailable | Readiness capped at `REVISED CONDITIONALLY READY`. An independent reviewer (separate agent or human) would need to validate the brand voice recasts before `IMPLEMENTATION-READY` is achievable. |
| Background librarian (bg_57b2df9e) | ⛔ Failed (30min timeout) | Substitute: emulated synthesis from `MASTER §2` (which is canon). Recorded in `18_RESEARCH_AND_EVIDENCE.md`. |
| Background explore (bg_2aafffb3) | ⛔ Cancelled (24min timeout) | Substitute: lead-direct `rg` + file reads. Output captured in `03` §3. |

### 3.3 Implementation-time gates (to verify when execution begins)

| Gate | Status | Impact |
|---|---|---|
| `bun run lint:design-system` baseline green | ⚠️ To verify in Phase 1A | If red, fix before any landing copy changes |
| `claims-matrix-check.mjs` reconciles `claims-data.ts` against Feature Inventory | ⚠️ To verify in Phase 3B | If broken by Ledger reorder, update the gate |
| `/changelog` and `/roadmap` routes exist? | ⚠️ To verify in Phase 5 | If not, footer links should omit them or create stub routes |
| `/signup` flow supports "Start free" CTA? | ⚠️ To verify in Phase 1B | If invite-only, keep "Request access" per `19` §0 |
| Real screenshots can be captured without exposing sensitive data? | ⚠️ To verify in Phase 2B | Use seed/demo data only |

---

## 4. Adversarial review result

Per `Multi-Agent-Execution-Directive.md` §12. Adversarial reviewer was emulated by the lead.

**Adversarial scenario matrix:**

| Scenario | Adversarial question | Plan response |
|---|---|---|
| Founder rejects the corrected defaults | What happens? | Only the affected surface is blocked. If the founder rejects the hero-preservation invariant or the entire product-voice premise, the plan must be re-scoped. |
| Plan recasts a canon string the founder didn't approve | Does the plan recast `MASTER §0` strings? | No. The plan proposes surfacing canonical strings (`08` §11) and recasting the public-surface copy (`06` §4). Canon recasts go through OPEN-DECs. |
| Plan invents customer proof | Does the plan fabricate logos, testimonials, metrics? | No. `08` §1 + `14` RISK-001 explicitly ban fabrication. `company-proof-data.ts` gate (`getRenderableCompanyProofItems`) is preserved. |
| Plan claims roadmap items are shipped | Does the plan misrepresent status? | No. `08` §3-5 maintain the Live/Building/Planned/NotUs taxonomy. Phase 1A lint pass removes "AI is on the roadmap" as a section heading but preserves the Claims Ledger row. |
| Plan touches authenticated app, API, or provider state | Out of scope? | No touch. `02` §2 explicitly excludes `/workshop/**`, `/api/**`, `/share/[token]`, `/invite/[token]`, all auth flows, all Cloudflare bindings, all migrations, all package manifests. |
| Plan deletes the Claims Ledger system | Does the plan break the existing discipline? | No. `03` §5 + DEC-F preserve the system; only the rendering order on /features changes. |
| Plan adds new dependencies or renegotiates DESIGN.md tokens | Scope creep? | No. `09` extends DESIGN.md landing-only; does not renegotiate SF Pro, neutral palette, xs radius, or 12px max for app. |
| Plan commits to a public launch date | Out of scope? | No. `02` §5 explicitly refuses to commit to a launch date. |
| Plan changes pricing numbers | Founder-owned? | No. `08` §8 explicitly defers numbers to `MASTER §9`. |
| Plan's lint rule breaks CI | What happens? | Lint rule is a new script (`scripts/landing-copy-lint.mjs`); can be merged independently. If it red-flags existing-but-acceptable copy, escalate as new OPEN-DEC. |
| Plan adds new font dependency | Does the plan require a new mono font? | No. `09` §0 and `15` §0 default to existing configured fonts/system mono. |
| Plan keeps stacked sticky clutter | Does the plan preserve the AudienceBanner? | No. `11` §0 removes the stacked AudienceBanner by default. |
| Plan keeps fake counters | Does the plan preserve the animated metric counters? | No. `04` §0 and `20` §0 require no fake proof. |
| Plan lacks mobile collapse | Does the plan handle <768px? | Yes. `07` §7 (formerly §6) and `20` §3.3 specify aggressive single-column fallback. |

**Adversarial verdict:** No P0/P1 omissions. 14 scenarios challenged, 14 satisfied.

---

## 5. Final verification result

| Verification class | Result | Notes |
|---|---|---|
| Plan-doc completeness | ✅ All 20 numbered docs + README | See `README.md` status table |
| Plan-doc cross-references | ✅ All `*.md` links resolve | Every doc cross-links to siblings via relative paths |
| Audit inventory line numbers | ✅ Match `git HEAD` 2026-07-05 | Verified via direct file reads; explore agent cancelled but substitute `rg` output captured |
| No source code touched | ✅ Confirmed via `git status` review (planning-only writes) | All writes were `.ai/03_plans/2026-07-05-Brand-And-Landing-Page/*.md` |
| No tests / migrations / package touched | ✅ Confirmed | None modified |
| No git operations | ✅ No commit / branch / push | None performed |
| User instruction compliance | ✅ All 4 user asks addressed | See §2 above |
| Verification mode recorded | ✅ `emulated` | Caps readiness at `REVISED CONDITIONALLY READY` |
| 2026-07-06 planning continuation | ✅ Docs-only | Verification target is plan-pack consistency, not app runtime |
| Background task integration | ⚠️ Partial | Librarian failed; explore cancelled. Substitutes documented in `18`. |

---

## 6. Final report

**Plan deliverables:** 20 numbered docs + README + 00 (full list in `README.md`).

**Plan status:** `REVISED CONDITIONALLY READY`.
**Verification mode:** `emulated`.
**Reason for cap:** No independent verifier; true founder blockers are defaulted but not owner-confirmed.

**Implementation entrypoint:** Phase 0 (confirm true blockers/defaults) -> Phase 1A-1E (parallel-safe atomic slices) -> Phase 2A-2C (sequential structural recasts) -> Phase 3A-3D (parallel supporting page reframes) -> Phase 4A-4B (homepage proof + close) -> Phase 5 (final visual polish + DESIGN.md additions) -> Phase 6 (A/B + analytics).

**Recommendation to founder:**
1. Read `20` §0, `09` §0, `19` §0, `11` §0, and `15` §0 first.
2. Confirm or override only the true blockers in `15` §0.
3. Keep the hero mockup unless the product positioning changes materially.

**Recommendation to implementation agent:**
1. Re-verify `git status --short --branch` is clean.
2. Re-read `landing-content.ts` + `ArchestimatorLandingPage.tsx` (drift check).
3. Confirm `bun run lint:design-system` baseline.
4. Confirm `claims-matrix-check.mjs` passes baseline.
5. Execute Phase 1A or Phase 1B first; integrate owner overrides only where they affect the active surface.

---

## 7. Plan archive (when complete)

After implementation completes (Phase 6 + post-impl closeout):
- Mark this plan `implemented` in `README.md` and `17` (this file).
- Append closeout entry to `.ai/10_state/current-state.md`.
- Reflect approved recasts back into `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` §0 + §10.2.
- Optional retrospective at `.ai/13_research/brand-and-landing-page-post-impl-review-YYYY-MM-DD.md`.
