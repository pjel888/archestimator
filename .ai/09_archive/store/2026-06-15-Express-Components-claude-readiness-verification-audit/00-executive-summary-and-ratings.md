---
title: Executive Summary & Ratings — Express Components Readiness Verification
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
subject: .ai/03_plans/2026-06-15-Express-Components/
---

# Executive Summary & Ratings

## Verdict

**The remediated Express Components plan pack is genuinely strong, factually well-grounded,
and document-complete — and it is close to, but not yet at, the "mission-critical day-0"
bar.** Independent ground-truth verification at `72628d46` confirms the plan's central
architecture is correct and feasible: the update RPC already accepts the full express field
set (U3 needs no migration — *verified true in SQL*), the insert RPC already returns the row
snapshot and is correlation-idempotent, every permission helper exists, the column model needs
no schema change, and the promotion RPC is genuinely buildable. The prior audit's 5 criticals
and 6 recommended documents were **genuinely absorbed** (not just nominally) — absorption
scores 91/100.

But verification also surfaced a fresh layer of defects that survived both prior passes:

- **A missed mutation surface:** the AI package-builder *write* path (`apply.ts`) overwrites
  `metadata` wholesale and can clobber `metadata.expressComponent` — the exact KTD7 hazard,
  on a surface the blast radius never enumerated.
- **A virtualization blocker the plan waves past:** the row `<tr>`s carry
  `content-visibility:auto` + `contain-intrinsic-size:96px`, which *corrupts* the
  `measureElement` approach doc 09 prescribes; the honest path is doc 09's own
  disable-on-active-editor fallback.
- **An accessibility regression that survived:** doc 09 still blesses `#7F7F7F` for
  load-bearing placeholders/labels, which fails WCAG AA at ~3.5:1.
- **A traceability self-inconsistency, a duplicated/contradictory bullet, and an undefined
  express-stable-id collision rule.**
- **An unmade strategic decision:** the 9-unit bundle is labeled "day-0" but the plan's own
  ship-slice ordering puts promotion and the projection last; the true day-0 core is U1–U4.

**Recommendation: do not start the full 9-unit bundle as a single day-0 push.** Apply the 13
corrections in `07-actionable-remediation-checklist.md`, make the explicit **scope + premise
decision** (`05`), then ship the **U1–U4 core** behind the existing flag. With the corrections
and the cut, the core is ship-ready; U5/U6/U7 become fast-follows where the plan already
sequences them.

---

## The three ratings you asked for (1–100)

| Dimension | Score | One-line basis |
|---|---:|---|
| **Implementation readiness** (full 9-unit bundle) | **76** | Core (U1–U4) is verified-feasible; held back by 13 concrete corrections + 3 promotion-RPC under-specs + a virtualization blocker + net-new stale-revision UX. |
| **Implementation readiness** (recommended U1–U4 day-0 slice, post-fix) | **84** | After the listed fixes, the inline-authoring core is cleanly buildable on verified primitives. |
| **Strategy** | **64** | No-new-table is defensible for the literal request, but day-0 scope is over-bundled and the "stable-id hedge + projection + promotion" builds most of a catalog the plan declines to model. |
| **Documentation quality** | **87** | Precise, citation-dense, internally coherent, genuinely complete; loses points for one contradictory bullet (V8), orphaned QA rows (V10), the express-id gap (V6), and the surviving AA violation (V9). The DB contract doc is accurate — the suspected `contingencyPercentage` error was a verifier mistake, retracted (V1). |
| **Overall** | **78** | Right architecture, verified foundation, real remaining corrections + one unmade strategic call. |

### Sub-dimension ratings (the angles you named)

| Angle | This audit | Prior audit | Movement |
|---|---:|---:|---|
| Supabase / provider scrutiny (RLS, grants, RPC) | **88** | 85 | Confirmed sound; new under-specs found in promotion RPC |
| Database implications (RPC/JSON/migrations) | **84** | 64 | KTD7/U3 corrected and *verified* against the live RPC; full field set incl. `contingencyPercentage` confirmed persisted |
| Blast-radius / cross-app accuracy | **84** | 58 | Big improvement; AI-write path still missed |
| UX / UI coverage | **71** | 52 | Three criticals de-fanged; virtualization blocker + AA survive |
| Accessibility | **66** | 55 | aria/live/labels good; `#7F7F7F` AA failure persists |
| Internal coherence / consistency | **86** | 78 | Strong; one contradiction + orphaned traceability |
| Security / permissions / concurrency | **82** | n/a (was a blind spot) | Now substantively covered; 2 claims need correction |
| Audit-absorption (did remediation work?) | **91** | n/a | All 5 criticals + 6 docs genuinely closed |
| Test / QA rigor | **80** | 58 | Q1–Q43 with traceability; a few orphaned Q rows |

> Aggregate of the 6 lane scores = **80.8/100** (range 58–91). Lowest lane: **strategy (58)**,
> driven by scope-framing and premise challenges, not by execution quality. Highest:
> **audit-absorption (91)**. This corroborates the **78 overall**.

---

## Trajectory vs the prior audit

The prior audit rated the *pre-remediation* pack **66 overall / 62 readiness** and projected
"~62% → ship-ready" after remediation. The remediation moved it to **~78 overall**. That is
real, measurable progress — the plan crossed from "do NOT begin implementation" to "the core
is buildable after a short, well-defined correction pass." It did **not** reach "very close to
perfect," and the reasons are now narrow and concrete rather than systemic.

---

## What the plan gets RIGHT (verified — keep all of it)

1. **The architecture is correct and SQL-feasible.** `update_estimate_row_item_with_history`
   already reads the full express field set; JSON merge is exactly omit-preserve / send-replace;
   the insert RPC returns `rowRevision` and is correlation-idempotent; the column model is
   sufficient; promotion is genuinely buildable (`create_cost_library_component` already does
   item+price-option atomically). (`02`)
2. **The remediation genuinely closed the prior 5 criticals** with concrete mechanisms, not
   words: dynamic virtualization + ≥75-row repro, real `projectId` plumbing reframing, the
   keyboard carve-out, the atomic promotion RPC, and the U5 reproduction gate. (`06`)
3. **The hardest blind spot (realtime concurrency) is now substantively addressed** with a
   feasible model on a collaboration subsystem that really exists. (`02`, security lane)
4. **Factual grounding remains excellent** — line/symbol/enum/RLS claims hold up under
   re-verification.

## The headline corrections (in priority order)

| # | Finding | Severity | Fix lands in |
|---|---|---|---|
| V2 | AI package-builder **write** path clobbers `metadata.expressComponent` | **P1** | doc 04 U8 + doc 10 |
| V3 | `content-visibility:auto`+`contain-intrinsic-size` breaks the `measureElement` plan | **P1** | doc 09 |
| V4 | Promotion RPC under-specs: editor/admin gate not free, price-option NOT-NULL cols, DEFINER grants, folder-workspace binding | **P1** | doc 07 + doc 11 |
| V5 | `sort_order` computed outside the RPC lock → concurrent-insert unique violation | **P1** | doc 10 + U2 |
| V6 | Express stable-id generation + collision-on-copy undefined (Q14/Q34 contradiction) | **P1** | doc 02 + doc 07 |
| V7 | Stale-revision recovery UX has **zero** existing hook (net-new, plan implies smaller) | **P1** | doc 11 |
| V8 | doc 04 line 140 duplicated bullet contradicts line 131/132 (dashboard source) | **P2** | doc 04 |
| V9 | `#7F7F7F` blessed for load-bearing text → fails WCAG AA | **P2** | doc 09 |
| V10 | Orphaned QA rows (Q14/15/16/37/42) + unmapped RSK6 in traceability | **P2** | doc 08 |
| V11 | U1 "add metadata to workspace-repository SELECT" is a no-op (already selected) | **P2** | doc 04 U1 |
| V12 | doc 10 invariant misdescribes `applyEditableValuesToLibraryItem` | **P2** | doc 10 |
| V13 | doc 11 "draft has no server row id to broadcast" is factually wrong here | **P2** | doc 11 |
| V14 | telemetry has no owner/event-names; draft-abandon-on-nav undefined; static gate manual | **P2** | doc 12 + doc 11 |

Full detail, evidence, and exact edits in `01` and `07`. (One verifier finding — V1, a suspected
`contingencyPercentage` RPC drop — was **retracted** after I checked the live migration directly;
the field is persisted. The retraction is kept on record in `01`.)

## The one strategic call to make before building

**Decide day-0 scope explicitly and validate the inline-vs-modal assumption.** Both of the
plan's *Critical* risks (RSK7 virtualization overlap, RSK10 keyboard/caret conflict) exist
**only because** authoring is inline-in-a-virtualized-cell. A one-day spike of an active editor
in a ≥75-row virtualized list will tell you whether inline survives contact with the grid; if
it doesn't, a quick-add modal eliminates both criticals and half the editor complexity. Cut
day-0 to U1–U4; let U5 (unreproduced bug), U6 (projection), and U7 (promotion) be fast-follows.
See `05`.
