---
title: Express Components Plan Pack — Executive Summary & Ratings
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
subject: .ai/03_plans/2026-06-15-Express-Components/
method: full plan read + ground-truth code verification @72628d46 + live Supabase (ebxxqidacheyapmmzavr) + 13-lane / 27-agent adversarial workflow
---

# Executive Summary & Ratings

## Verdict

**The Express Components plan pack is a genuinely good, well-grounded directional plan that
is NOT yet safe to start implementing for a "mission-critical day-0" bar.** Its factual
foundation is unusually strong — file/symbol/enum/RLS claims hold up under ground-truth
checking, and the central architectural decision (author express rows in `estimate_row_items`,
no new table) is correct and well-argued. But the pack (a) **overstates one load-bearing DB
premise (KTD7)** while **understating that several fixes need migrations**, (b) carries **3
verified-critical implementation traps** the docs treat as solved, (c) ships **U5 (the icon
bug fix) against a bug that was never reproduced or root-caused**, and (d) has a **systemic
blind spot**: it was written as a single-user, desktop, never-rolled-back feature, with no
treatment of realtime multi-client collaboration (which this estimate sheet *has*), mobile,
permission boundaries, or a kill-switch.

**Recommendation: do NOT begin implementation. Spend one more planning iteration** to (1)
apply the claim corrections in `01-claim-verification-matrix.md`, (2) resolve the 5
critical-tier issues below, (3) reproduce the U5 bug before writing its fix, and (4) add the
6 recommended documents in `04-gaps-and-recommended-documents.md`. With those, this pack
moves from ~62% to ship-ready.

---

## Headline ratings (1–100)

| Dimension | Score | One-line basis |
|---|---:|---|
| **Implementation readiness** | **62** | Accurate grounding, but 3 verified-critical traps, an unreproduced bug fix, and key load-bearing steps left unspecified. Not buildable cleanly today. |
| **Strategy** | **78** | No-new-table decision is correct and defensible; deferred product fork is reasonable; scope is slightly over-bundled (8 units incl. promotion + projection + bug fix). |
| **Documentation quality** | **72** | Precise, citation-dense, internally coherent; loses points to KTD7 overstatement, `itemCost`/`unitCost` naming drift, no traceability matrix, and a misdiagnosed bug. |
| **Overall** | **66** | Right direction, strong evidence base, real gaps before it is safe to build. |

### Sub-dimension ratings (the angles you asked about)

| Angle | Score | Notes |
|---|---:|---|
| Blast-radius accuracy | **58** | Misses `clearRowComponent`/`moveRowComponent` (revert express→blank), `applyEditableValuesToLibraryItem` (drops express text on replace/move), and that `metadata.expressComponent` is not in the read SELECT/type at all. |
| Supabase / provider scrutiny (RLS, grants, schema) | **85** | Accurate: every `link_state` enum value is real, RLS policies match, RPC signatures match. Live-verified in `evidence/live-supabase-verification.md`. |
| Database implications (RPC/JSON/migrations) | **64** | KTD7 "JSON replaced wholesale" is overstated; the update RPC already accepts the full field set; but the `row_blank_added` fix and any atomic promotion need migrations the headline downplays. |
| UX / UI coverage | **52** | Critical arrow-nav-vs-caret conflict unresolved; incomplete interaction-state set; focus-on-insert collides with existing quantity-cell focus effect; AA-contrast floor unstated. |
| Accessibility | **55** | Right instincts (aria-live, labels, tree roles) but reuses `#7F7F7F` tertiary for load-bearing meta (fails WCAG AA) and invents a "Creating" state absent from the 5-value save machine. |
| Downstream / cross-app impact | **72** | Good on totals (correct) and history; needs a per-surface field contract (where each express attribute must live: row column vs metadata vs source_snapshot). |
| Internal coherence / consistency | **78** | Strong; risk register (RSK1–9) is coherent. Loses points to terminology drift and absent R→U→AE→Q traceability. |
| Test / QA rigor | **58** | QA matrix is thoughtful but carries no traceability IDs, no test-change inventory, and no ≥75-row virtualization repro (where the overlap bug actually occurs). |

> Aggregate of the 13 lane readiness scores = **63.8/100** (range 52–78), which corroborates
> the 62 readiness headline. Lowest lanes: promotion (52), UX/a11y (52), virtualization (58),
> projection (58), blast-radius (58). Highest: coherence (78), downstream (74), strategy (72).

---

## What the plan gets RIGHT (keep this)

1. **The core decision is correct.** Authoring express rows in `estimate_row_items` with
   `metadata.expressComponent` identity, no new table, is the right call — *and the live DB
   confirms it is feasible*: both the insert and update RPCs already accept the full express
   field set; `link_state` already has every value the plan uses; RLS already covers the path.
2. **Factual grounding is strong.** Lane ground-truth-accuracy scores were 85–95%. Cited
   `file:line` references are almost all exact at `72628d46`.
3. **The risk register (RSK1–9) is honest and coherent** and most P1 review findings in doc 06
   are correctly resolved into units/QA.
4. **The hard problems are at least *named*** — insert/edit race, JSON merge, promotion
   atomicity, blank-vs-express classification, virtualization height — even where the
   resolution is incomplete.
5. **Several worries are *already solved* by the DB and the plan can relax them:** the insert
   RPC returns `rowRevision`; insert is idempotent by `correlation_id`; optimistic locking via
   `expected_row_revision` exists. (The plan re-invents these; see corrections.)

---

## The 5 critical-tier issues to resolve before building

| # | Issue | Where | Status |
|---|---|---|---|
| C1 | **Row virtualizer is FIXED-height** (`estimateSize: () => 96`, no `measureElement`). An expanding inline express editor (multi-line description, error, image) will **overlap the next row** in any estimate ≥75 rows. The plan's "keep height stable / disable virtualization for active rows" is hand-wavy. | `row-table.tsx:421,594`; sibling pattern at `tree.tsx:1281`, `virtual-branch-list.tsx:143` | **Verified CRITICAL** |
| C2 | **No `projectId` reaches the Components tab today.** KTD6/U6 read as "gate existing plumbing," but the workspace Components route has *zero* project context — this is **net-new plumbing**, and the projection may belong on the estimate-side sidebar (which *does* have `projectId`) instead. | `app/workshop/library/components/page.tsx:8`, `LibraryComponentsRoute.tsx:9`, `component-library/index.tsx:608` | **Verified CRITICAL** |
| C3 | **Arrow-nav vs text-caret conflict has no resolution.** `handleEstimateCellKeyDown` unconditionally `preventDefault`s Arrow/Enter on cells; with no express-field carve-out it will **hijack caret movement** inside express text inputs. The plan states the goal but not the mechanism. | `cells.tsx:45-73`, `row-table.tsx:254/310/345` | **Verified CRITICAL** |
| C4 | **Promotion spans two transactions with no atomic boundary.** No existing RPC touches both `cost_library_items` and `estimate_row_items`; create-then-relink can orphan a library item, and the idempotency guard is written *after* create, so a partial failure leaves no guard and a retry double-creates. | `component-library/actions.ts:448`, `estimates/actions.ts:2571`; `create_cost_library_component` | Authored critical; verify tempered to **high** (core confirmed) |
| C5 | **U5 fixes an unreproduced bug.** The plan's 4 candidate causes are speculation; the optimistic clone *preserves* link fields and DB-backed components carry `sourceLibraryItemId`, so both duplicate instances should pass the gate. The one code-grounded failure mode is **non-UUID seed/fixture data**, not "the second instance." | `EstimateSheetContent.tsx:352`, `actions.ts:2552`, `cells.tsx:79-82` | **Verified high; bug genuinely unverified** |

---

## The most important correction (raises readiness, fixes the plan's framing)

**KTD7 is overstated.** The plan says the update RPC "replaces `metadata` and `source_snapshot`
wholesale," so every express edit must server-merge full JSON. Live truth
(`update_estimate_row_item_with_history`): it only writes a JSON column **when the patch
contains that key** — `metadata = case when row_patch ? 'metadata' then ... else row_item.metadata end`.
So **routine field edits that omit `metadata`/`sourceSnapshot` are already safe**; the merge
discipline is needed *only* when you intentionally mutate those JSON blobs (promotion relink,
express-metadata changes). Correct U3/KTD7 to say exactly this. Corollary: **widening the
update contract (U3) is an app-layer typing change, not a migration** — but the `row_blank_added`
reclassification (U2/U8) and any atomic promotion RPC (U7) *do* require migrations, which the
"no migration by default" headline should stop implying otherwise.

---

## Systemic blind spots (the completeness critic's finding — currently uncovered by the pack)

These are not nitpicks; they are the failure modes that turn a day-0 launch into an incident:

1. **Realtime multi-client concurrency.** The estimate sheet runs a live collaboration
   subsystem with cell-level cursor anchoring (`src/lib/collaboration/*`,
   `use-estimate-cursor-broadcast.ts`, `EstimateSheetContent.tsx` `resolveCursorTarget`). The
   entire "buffer commits until persisted row revision" contract is single-client by
   construction: client-generated optimistic row ids, a peer with no render path for an
   in-flight draft express row, and `expected_row_revision` stale-conflict UX are all
   unspecified. **This is the single largest gap.**
2. **Mobile / touch / responsive** — zero coverage; touch has no arrow keys (worsens C3) and
   on-screen keyboards resize the viewport mid-edit (worsens C1).
3. **Permission/role boundary** — no lane could confirm read-only collaborators are blocked
   from express authoring, and promotion crosses an **estimate-edit → workspace-editor**
   privilege boundary (RLS differs) that U7 never gates.
4. **Operational rollback / kill-switch** — no feature flag for Express; no answer for how
   persisted express rows render under reverted (old) code.
5. **Existing-data behavior** — 29 legacy `unlinked` source-less rows already exist in prod
   (live count); the blank-vs-express classification and the `row_blank_added` reclassification
   must be proven forward-only against real data.
6. **Analytics/telemetry, i18n of new microcopy, and a first-class error-budget UX** — all
   unspecified.

---

## Are 6 documents enough?

**No.** The 6 docs are a strong *strategy + design + readiness* spine, but a mission-critical
day-0 build needs ~6 more **contract/operational** documents the pack lacks: an RPC/row-patch
contract, a traceability matrix, a test inventory, an edge-case/failure-mode catalog, a
rollout/kill-switch runbook, and a keyboard/focus + state/copy spec — plus the two new
concern areas (concurrency, permissions). See `04-gaps-and-recommended-documents.md` for names,
purposes, and ready-to-fill outlines.

---

## How to read the rest of this audit

- `01-claim-verification-matrix.md` — every claim → verified / corrected, with the exact fix.
- `02-blast-radius-and-cross-app-impact.md` — the complete radius the U-units must cover.
- `03-ux-ui-and-accessibility-assessment.md` — interaction states, keyboard, virtualization, a11y.
- `04-gaps-and-recommended-documents.md` — the documents to add, with outlines.
- `05-actionable-remediation-checklist.md` — P0→P2 to-dos for the codebase AI.
- `evidence/live-supabase-verification.md` — the authoritative live DB contract.
- `evidence/agent-findings.md` — all 85 raw findings + adversarial verdicts.
