# Landing Page Redesign — Plan Pack

> **PLANNING PACK · 2026-06-21 · revised 2026-06-22 · not code.**
> Archestimator's complete public marketing + auth surface, redesigned in the **Glass Brand**
> voice the product already speaks. This README is the entry point; it owns the doc-order, the
> dimension ownership contract, and the **Definition of 100 %** the audit reconciles against.

**One-line summary:** the public surface (`/`, `/features`, `/pricing`, `/about`, `/contact`, new
`/trust`, and the auth surface `/login` + `/signup`) redesigned as the **same brand as the
Workshop Dashboard + Estimate Sheet** — liquid-glass surfaces over a warm grey canvas, signal
orange `#F24405` / clay-dark `#C63804`, Doto + Roboto Mono + SF Pro type — with a claims-tagged
commercial-graph architecture plate as the moat move and **radical honesty (Live / Building /
Planned)** as the proof engine. No logos, no testimonials, no stats (none exist; MASTER §15
forbids inventing them).

> **2026-06-22 revision (D-1..D-5).** The prior version of this pack locked a *different*
> direction — "The Document" (warm paper `#FFFDF8` + Source Serif 4). Per the owner's directive
> ("focus on our brand — liquid glass, signal orange; the Workshop Dashboard + Estimate Sheet
> are the brand I love") that direction is **demoted to a documented alternative** (Direction D,
> see `01-DESIGN-DIRECTION.md` §3.4) and **The Glass Brand is now the default**. Five keystone
> decisions (D-1..D-5) were ratified 2026-06-22; see §2. The prior "100/100/100 across all docs"
> claim is **recalled (D-5)** — it was self-assessed, not independently verified.

---

## 1. Read this first

If you are new to the pack, read in this order:

1. **`00-OVERVIEW.md`** — the **five ratified keystone decisions (D-1..D-5)**, the three strategic
   pillars, the route map, the success criteria, the sign-off gates. **Start here.**
2. **`01-DESIGN-DIRECTION.md`** — *why* **The Glass Brand** direction wins (and why "The Document"
   is now the alternative), with the Intercom + Amigo peg study.
3. **`23-AUTH-EXPERIENCE.md`** — the full-page 2-column signup/login surface (D-2; the owner's
   explicit ask) — glass left panel, fields right, Google OAuth + magic link, no password.
4. **`10-CANONICAL-DOC-MAP.md`** — the canonical filenames (every cross-link reconciles to this).
5. **`MASTER-AUDIT-AND-SCORECARD.md`** — the **honest** scorecard (post-2026-06-22 re-audit) + the
   honest two-rubric verdict.
6. **`MASTER-IMPLEMENTATION-PLAN.md`** — the execution-layer handoff, current-codebase checkpoint,
   minimum shippable slice, and agent coordination protocol. Read this immediately before code.
7. Then pull the rest on demand per the entry-order in `10-CANONICAL-DOC-MAP.md` §3.

---

## 2. The five ratified keystone decisions (obeyed by every doc; 2026-06-22)

1. **D-1 — Design direction = "The Glass Brand."** The landing IS the same brand as the Workshop
   Dashboard + Estimate Sheet: liquid-glass surfaces over the warm canvas (`--canvas #f5f5f5` +
   `--grad-canvas-wash`), signal orange `#F24405` (presence) + `--brand-orange-dark #C63804`
   (AA small text), Doto (display) + Roboto Mono (numerals) + SF Pro (UI), 8px rhythm, 3/8/12px
   radii. Source Serif 4 + warm paper is **Direction D (alternative)**, not the default.
2. **D-2 — Auth = full-page 2-column.** `/login` + `/signup` (not modals): brand glass panel left,
   auth fields right, collapses to one column `<768px`. Auth model is Google OAuth + magic link
   (no password — that is the real product model). "Start free" → `/signup` is gated on the
   beta-onboarding decision (`L-FUN-2`); until then it routes to `/login` or `/contact`.
3. **D-3 — Orange token discipline (hard contract).** `--brand-orange #F24405` = presence (fills,
   logo slab, focus rings, accent rails). `--brand-orange-dark #C63804` = AA small text/icons.
   Clay `#AA412A` is **not a token, never used** (DESIGN.md prose only).
4. **D-4 — `ClaimStatus` type contract (hard contract).** One shared type
   `"Live" | "Building" | "Planned" | "NotUs"` in `src/components/landing/shared/StatusPill.tsx`;
   the plate (doc 04) narrows to the Live/Building/Planned subset. No divergent type defs.
5. **D-5 — Honest scoring.** A doc is 100 % only when **verifiable**; genuinely owner-gated items
   are carried openly in `LOOP_LEDGER.md` (gate #4 below), never silently closed. The prior
   "100/100/100 across all docs" claim is recalled.

The prior "locked decisions" (CTAs = "Start free"/"Book a walkthrough"; scope = the marketing
system; proof = radical honesty) **carry over unchanged** and are restated in `00-OVERVIEW.md` §2.

---

## 3. Dimension ownership (the contract)

Every dimension the redesign touches has exactly one owning doc. The full table lives in
`10-CANONICAL-DOC-MAP.md` §5; the summary:

| Dimension | Owner |
|---|---|
| Strategy / direction | `01-DESIGN-DIRECTION.md` |
| Section taxonomy / IA / funnel | `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` |
| Visual language / tokens / type | `03-VISUAL-LANGUAGE-AND-TOKENS.md` |
| The commercial-graph plate | `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` |
| Copy / voice | `05-COPY-SKELETON.md` |
| Claims discipline / proof model | `06-PROOF-AND-CLAIMS-DISCIPLINE.md` |
| Engineering / RSC / responsive / funnel | `07-ENGINEERING-CONSTRAINTS.md` |
| Rollout / A/B / analytics events | `08-ROLLOUT-AND-ANALYTICS.md` |
| Claims-sign-off gate | `09-CLAIMS-LEDGER-SIGN-OFF.md` |
| Component inventory / anatomy | `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` |
| **Auth experience (D-2)** | **`23-AUTH-EXPERIENCE.md`** |
| Accessibility (WCAG 2.1 AA) | `12-ACCESSIBILITY-AUDIT.md` |
| SEO / discovery | `13-SEO-AND-DISCOVERY.md` |
| Performance / Core Web Vitals | `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` |
| Forms / abuse guardrails | `15-FORMS-AND-ABUSE-GUARDRAILS.md` |
| Test / verification | `16-TEST-AND-VERIFICATION-PLAN.md` |
| Analytics / observability | `17-ANALYTICS-AND-OBSERVABILITY.md` |
| i18n / localization (PH + SEA) | `18-I18N-AND-LOCALIZATION.md` |
| Asset pipeline / imagery | `19-ASSET-PIPELINE-AND-IMAGERY.md` |
| Content workflow / governance | `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` |
| Blast radius / migration | `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` |
| Peg-study deep dive (evidence) | `22-PEG-STUDY-DEEP-DIVE.md` |
| Implementation execution handoff | `MASTER-IMPLEMENTATION-PLAN.md` |
| Cross-link integrity | `10-CANONICAL-DOC-MAP.md` |
| Audit / scorecard | `MASTER-AUDIT-AND-SCORECARD.md` |
| Loop state / open decisions | `LOOP_LEDGER.md` |

---

## 4. Definition of 100 % (the completion gate — honesty-aware, D-5)

The pack is at **100 %** when **all** of the following hold. Per D-5, "100 %" is reported on **two
rubrics** because the two answer different questions:

**Rubric A — Planning-achievable (the gate this pack owns):**

1. **Every gap is closed OR explicitly owner-carried.** Every doc is at its honest verifiable
   level on Strategy / Quality / Implementation-Readiness (per-doc scores recorded in
   `MASTER-AUDIT-AND-SCORECARD.md` §7). A doc is *not* required to be 100/100/100 — it is required
   to be **honest** about its level and to **carry** every genuinely-open owner gate in
   `LOOP_LEDGER.md`. (The recalled posture — "every doc 100/100/100" — was self-assessed and
   unverifiable; D-5 retires it.)
2. **Cross-link integrity = 100 %.** Every cross-doc link resolves to a canonical filename in
   `10-CANONICAL-DOC-MAP.md` §1. Verified by the grep in §4 of that doc.
3. **Every dimension in §3 has an owning doc that exists.**
4. **Every ⚠️ GATED ON item is carried as an open owner decision in `LOOP_LEDGER.md`.** No gate is
   silently dropped; no gate is silently closed.
5. **The originally-missing docs exist** (M-1 → M-17 + `README`, `LOOP_LEDGER`,
   `10-CANONICAL-DOC-MAP` — all created 2026-06-21), **`23-AUTH-EXPERIENCE.md` exists**
   (created 2026-06-22), and **`MASTER-IMPLEMENTATION-PLAN.md` is integrated as the execution
   layer** rather than an untracked sidecar.
6. **The cross-cutting strategic gaps** (X-1 → X-10 in `MASTER-AUDIT-AND-SCORECARD.md` §5) **are
   closed** (each has an owning doc + a documented decision or owner-carried status).

**Rubric B — Execution-inclusive (the residual that is *by design* below 100):**

Implementation-Readiness across the pack sits at **~91 %** because a small set of genuinely-open
**owner** gates cannot be closed in planning (by D-5): the auth-route/beta-onboarding decisions
(`L-FUN-2`), the founder bio assets (`L-FND-1`), the perf-target ratification + analytics
tool (`L-ENG-1`/`L-ENG-2`), the live 30 fps a11y verify (`L-A11Y-1`), the competitive-scan
hypothesis (`L-PEG-1`), pricing validation (`L-PRC-1`), legal/DPA posture (`L-LEG-2`/`L-LEG-3`),
and the locale decision (`L-I18N-1`). These cap the pack below 100 % on execution — and that is a
**PASS** (carried openly), not a fail.

**Verdict (2026-06-22): Rubric A = 100 % (planning-complete); Rubric B = ~91 % (capped by carried
owner gates).** The pack is **implementation-ready** — a competent implementer can pick up any doc
and build exactly what it says, with every open owner decision surfaced (not buried) in
`LOOP_LEDGER.md`.

---

## 5. Status legend

| Tag | Meaning |
|---|---|
| `exists` | Doc is present and audited. (All docs in this pack now `exists`.) |
| `⚠️ GATED ON` | The plan leans on this item but cannot resolve it without the owner; tracked in `LOOP_LEDGER.md`. |
| `[Claims: Live/Building/Planned]` | The MASTER §15 status tag every public-word suggestion carries (see `06-PROOF-AND-CLAIMS-DISCIPLINE.md`). |
| `Direction D` | The demoted "warm paper + Source Serif 4" alternative; viable if the owner prefers it; **not** the default. |

---

## 6. Grounding

Every doc in this pack grounds its public-word suggestions in:

- **`ARCHESTIMATOR_MASTER.md`** at `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` (v4.3, 2026-06-18) —
  cited as `§X.Y` throughout. THE single startup corpus.
- **`PRODUCT.md`** + **`DESIGN.md`** at the project root — the product register and the
  alpha-stage design system (DESIGN.md is an alpha guide, not law; defer to Philip on design).
- **`src/app/globals.css`** — the token source of truth (glass + orange + type tokens verified by
  grep with line anchors throughout the pack).
- **`src/components/workshop/dashboard/WorkshopDashboard.tsx`** + **the Estimate Sheet
  glass/paper variant system** — the brand exemplars the landing reuses (see `22-PEG-STUDY-DEEP-DIVE.md` §4).
- **`src/app/page.tsx`** + **`src/app/layout.tsx`** + **`src/components/landing/*`** + **`src/app/login/page.tsx`** —
  the current implementation the redesign replaces.

See `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` for the full file-level change inventory before
any code is written.
