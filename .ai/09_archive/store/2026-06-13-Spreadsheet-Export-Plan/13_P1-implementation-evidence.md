# 13 — Implementation Evidence & Release Gates (P1 + P2 + P3)

> **Branch:** `claude/2026-06-13-Spreadsheet-Export-Plan` (off `main` @ `7481328d`).
> **Status:** **P1 + P2 + P3 implemented** (all agent-closeable items). Live-environment / DB-channel release gates are listed at the bottom.
> Owner decisions D0/D7/D8 confirmed 2026-06-13 (see [`.ai/10_state/decisions.md`](../../10_state/decisions.md)).
> **Tests:** 8 proposal-* files, **74 tests green** (was 36) on Node ≥ 20.12; `bun run type-check` + `bun run lint` (0 errors) clean throughout; one commit per task.

## Phase 2 — Format fidelity & control

| Task | Finding(s) | Summary |
|---|---|---|
| **P2-T1** | F-02/D2 | VAT (12%) + project contingency (10%) in the Summary totals (`resolveProjectCharges`, round-then-sum parity); shared `writeSummaryTotalsBlock`; INCLUDED mode; preview shows the tax-inclusive total |
| **P2-T2+T3** | F-11/F-12/F-19, 11§C | Settings validated off the wire (rates 0–100 → **400**); **audience server-derived** from `workspace_members` (internal granted to members only, escalation-proof); `includeFormulas` real; preview Export-settings panel → download URL |
| **P2-T4** | F-07 | Title block: Owner/Client (`projects.client_name`), contractor interim (workspace name), Project Ref/Code, Subject — DB-free; trimmed General Notes spacers to keep `DETAIL_HEADER_ROW=17` |
| **P2-T5** | F-09 | Hierarchical numbering — per-section line restarts + division letters (A/B/C…) on section headers |
| **P2-T6** | F-10/D3 | Cost per SQM = Grand Total / GFA from `estimates`/`projects` `.metadata.grossFloorArea` (JSONB read-side), else N/A |
| **P2-T8** | F-21/F-32/F-33 | Formula columns derived from `BID_FORM_COLUMNS` (+guard); unified Source Breakdown builder; malformed id (22P02) → **400**; `nosniff` |
| **P2-T7** | F-14/F-24 | Batched all-tabs fetch (`getEstimateTreesForTabs` + pure `groupEstimateTabTrees`) replacing the per-tab fan-out; early 413 via total over-fetch guard |

## Phase 3 — Polish & scale

| Task | Finding(s) | Summary |
|---|---|---|
| **P3-T3** | F-27/D6 | Canonical division order (keyword-mapped taxonomy; sections sorted, Preliminaries first) — code-only |
| **P3-T4** | F-34/F-28 | Accounting peso numFmt (`[$₱-3409]` mask); Grand Total amount-in-words |
| **P3-T1+T2** | F-01/F-08/F-29 | Labor/scope read-side via `estimate_row_items.metadata` (toUiRow → model); conditional LABOR disclaimer; EXCLUSIONS block for excluded scope |
| **P3-T5** | F-34 | Explicit `maxDuration=60`; benchmark regression-gate test |

> **P2/P3 DB-gated parts deferred (per plan + no DB channel):** D4 `workspace_profiles` contractor table; typed-column promotions for D1 labor / D5 scope; the optional D3 GFA column; contractor logo/branding; construction-duration data. All read-sides ship now via JSONB; the live batched-query shape (P2-T7) and RLS (P1-T8) are DB verification gates.

---

## What shipped (P1)

Each task = one commit, TDD, proposal tests kept green (`bun run test:dom`), gated with `bun run type-check` + `bun run lint`.

| Task | Finding(s) | Summary | Tests |
|---|---|---|---|
| **P1-T5** | F-15 | In-handler `getCurrentUserContext()` null-check → **401 JSON** (not 307) before any repo call | 401 fail-closed route test |
| **P1-T4** | F-13, F-25 | `try/catch` (`return await`) → logged JSON 500; structured `logProposalExport`; `Promise.allSettled` per-tab graceful skip (archived/rejected) | 500 + archived-skip + rejected-skip |
| **P1-T1** | F-05 | Fetch-then-blob download button (was bare `<a href>` saving error JSON as `.xlsx`); inline `role=alert` error; in-flight/empty disabled | dialog disabled/error + 413 inline + scoped-URL fetch |
| **P1-T10** | security | Per-user (+IP) `checkProposalExportRateLimit` reusing durable limiter → **429** | 429 route test |
| **P1-T9** | F-07, F-01, F-19 | Removed beta-placeholder bidder; visible LABOR material-only disclaimer (amber note + LABOR-header comment, compatibility-mode-gated); `applyAudiencePolicy` drops Source Breakdown sheet + supplier/pricing/confidence for the default **client** audience (server-derived) | placeholder-absence + disclaimer + default-redaction |
| **P1-T7** | F-18 | Text-typed (`@`) data string columns → CSV/formula-injection cells render verbatim, never formulas (Q5-compliant) | reload asserts `=HYPERLINK` stays verbatim text `numFmt @` |
| **P1-T6** | F-16 | Single-tab Summary unified onto dynamic `totalsStartRow = rowCount + 2` (was fixed A27–B32 collide >11 sections) | 15-section non-collision regression |
| **P1-T2** | F-03, F-04, F-20, F-35 | Preview reframed as **Contents summary** naming sheets (Commercial Terms flagged "review", Source Breakdown "internal/omitted"); D8=a hides the multi-tab single-tab total; validation issues surfaced | sheet list + review flag + hidden total + validation notes |
| **P1-T3** | F-06, F-26 | Esc/focus-trap/initial-focus/overlay-click/focus-return; control labels ≥11px, body ≥12px | initial-focus + Esc + overlay-close + opener focus-return |

Proposal test files: **7 files, 50 tests green** (was 36) on Node ≥ 20.12 (`bunx vitest run tests/vitest/proposal-`).

## Release gates — NOT closeable by an agent (confirm in the live/owner environment)

These are disclosed limitations, not defects. They must be checked before broad/client beta.

1. **P1-T8 — Live RLS (F-17).** Verify `relrowsecurity=true`, the expected `pg_policies`, and `FORCE ROW LEVEL SECURITY` on `projects`, `estimates`, `estimate_tabs`, `estimate_nodes`, `estimate_row_items`. *DB channel is unavailable to agents (Docker absent + hosted Supabase SQL denied by the permission classifier).* Record the result here and in `.ai/10_state/decisions.md` when run.
2. **Manual cross-app recalc QA gate ([11 §A](11_qa-and-decision-addendum.md#a-cross-app-recalc-qa-checklist)) — release blocker.** Open a single-tab (≥12 sections) and a multi-tab (≥3 tabs) generated file in **Excel + Google Sheets + LibreOffice** and check Q1–Q6 (Grand Total recalcs, VAT/Contingency display without `#REF!`, cross-sheet refs resolve, accounting numFmt aligns, the `=HYPERLINK(...)` injection cell shows literal text and is not a live formula, EXCLUDED zeroes its line). The workshop dev-auth bypass is disabled — produce the files via the owner's Chrome session.
3. **Browser UX (owner's Chrome).** Contrast of the gray tokens, jank on a large estimate, and the inline error-state rendering (413/500/429) of the new fetch-then-blob download.

## Pre-merge adversarial review (round 2) — 4 findings fixed

Before merging to `main`, the full `main…HEAD` diff was run through a multi-dimension adversarial
review (6 finder lenses → independent verify → synthesis). It surfaced **4 confirmed MEDIUM**
defects (0 critical/high) — all now fixed with regression tests:

| # | File | Defect | Fix |
|---|---|---|---|
| RV-1 | `build-proposal-export-model.ts` | `renumberProposalRows` counted excluded rows, so a section mixing included + excluded scope showed gaps (ITEM 1, 3) in the Bid Form, which renders only included rows | Number included rows per-section; excluded rows get an independent flat sequence matching the EXCLUSIONS block. Test: included/excluded interleave stays contiguous |
| RV-2 | `create-proposal-workbook.ts` | LINE TOTAL live formula `qty*COST_TOTAL` diverged from the pinned `costAmount` (round-then-sum) for fractional quantities → recalc drift in Excel/Sheets | Formula now `ROUND(qty*MATERIAL,2)+ROUND(qty*LABOR,2)+adj`, mirroring the model exactly. Test: fractional-qty parity (recalc == pinned; old form would diverge) |
| RV-3 | `ProposalExportPreviewDialog.tsx` | Contents summary always reported Source Breakdown "omitted", even when a member checked "Include internal Source Breakdown" and the download URL carried `audience=internal` | `buildExportContents` driven by the requested `includeInternalBreakdown` (members-only note). Test: flag flips to "Internal only" |
| RV-4 | `ProposalExportPreviewDialog.tsx` | `clampRate` used `Number("")===0`, so clearing a rate field silently committed 0%; decimals were also hard to type in the controlled number input | Empty/whitespace → keep prior rate (exported + unit-tested); rate inputs switched to `type=text inputMode=decimal` with a local draft so clearing/decimals work |

All 8 proposal-* files now hold **78 tests** (was 74). Full suite **1850 passed / 3 skipped**,
type-check + lint (0 errors) + `next build` clean, verified 3× deterministically.

## How to verify locally

```bash
bun run test:dom        # all vitest dom tests incl. the 8 proposal-* files (Node >= 20.12)
bun run type-check      # tsc --noEmit
bun run lint            # eslint (0 errors expected)
bun run build           # next build full compile
```
