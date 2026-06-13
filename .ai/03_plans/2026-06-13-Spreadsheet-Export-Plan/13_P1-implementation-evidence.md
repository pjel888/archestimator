# 13 — Phase 1 Implementation Evidence & Release Gates

> **Branch:** `claude/2026-06-13-Spreadsheet-Export-Plan` (off `main` @ `7481328d`).
> **Status:** P1 (Trust, Safety & Presentability) implemented; agent-closeable items done, live-environment gates listed below.
> Owner decisions D0/D7/D8 confirmed 2026-06-13 (see [`.ai/10_state/decisions.md`](../../10_state/decisions.md)).

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

## How to verify locally

```bash
bun run test:dom        # all vitest dom tests incl. the 7 proposal-* files (Node >= 20.12)
bun run type-check      # tsc --noEmit
bun run lint            # eslint (0 errors expected)
bun run build           # next build full compile
```
