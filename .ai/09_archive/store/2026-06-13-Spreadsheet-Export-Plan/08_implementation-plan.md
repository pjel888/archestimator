# 08 — Spreadsheet Export Improvement Plan

> **For agentic workers:** this is a **planning/roadmap** document (the audit task explicitly excludes coding). It scopes the work into phases, maps every task to a finding ID in [07_findings-register.md](07_findings-register.md), and gives files + acceptance criteria. At execution time, drive each task with `superpowers:subagent-driven-development` (TDD step breakdown happens there). Steps use checkbox syntax for tracking.

**Goal:** Make Archestimator's XLSX export *honest, safe, and industry-compliant* — the preview matches the file, the file matches real BOQ conventions (VAT/labor/title block/numbering), failures are handled, and the user has output control — without rebuilding the (sound) architecture.

**Architecture (approach):** Finish wired-but-hollow features and reconcile preview↔file. Keep the existing model→workbook pipeline and the narrow blast radius. Additive model fields only (renames break the preview + 7 tests). Plumb `ProposalExportSettings` end-to-end (UI → route → builder) instead of hardcoding defaults. Unify the duplicated single/tabbed builders so format changes happen once.

**Tech stack:** Next.js App Router (`runtime=nodejs`), ExcelJS 4.4.0, Supabase/Postgres (RLS, cookie-session client), TanStack Query, Zustand, Vitest.

---

## Decision gate (resolve before P2/P3 data tasks)

Decisions gate the data/format work. **Recommended defaults** (grounded in the 10 reference BOQs) let the plan proceed; confirm or override. See [02 §5](02_boq-format-benchmark.md) for context. **D0/D7/D8 were added by the second-pass adversarial review** — full trade-off framing in [11_qa-and-decision-addendum.md §B](11_qa-and-decision-addendum.md#b-decision-addendum-d0--d7--d8); **D7 blocks P1-T2 kickoff.**

| # | Decision | Recommended default | Blocks | Owner |
|---|---|---|---|---|
| **D0** | **Primary audience** of the default workbook | **Client/architect bid document is primary**; Source Breakdown + supplier/confidence/source-IDs become opt-in `audience=internal`. Makes the safe behavior the default. | F-19, P2-T3, audience default | Product |
| **D7** | **Preview approach** (BLOCKS P1-T2) | **Option B — "Contents summary"** (name the sheets) over Option A (render real Bid Form) — cheaper, honest, no F-22 sync/jank tax. Pick A only if pixel-fidelity preview is a hard requirement. | P1-T2 | Product |
| **D8** | **Multi-tab total in modal** | **(a) hide the single-tab number**, show "All N tabs — total in downloaded Summary" (no new infra; cannot misquote). (b) totals endpoint = P2/P3; (c) disclaimer-beside-wrong-number = rejected. | P1-T2 | Product |
| D1 | **Labor data source** (F-01) | Add an optional `labor_unit_cost` (or material:labor %) to estimate rows; until present, keep material-only with a **visible** disclaimer | F-01 | Product + DB |
| D2 | **VAT / contingency policy** (F-02) | VAT **12%** default (toggle to `INCLUDED`); contingency **configurable %, default 10%**, also allow `INCLUDED`; set via export settings, seedable from project | F-02, F-11 | Product |
| D3 | **GFA source** (F-10) | Add `gross_floor_area` to project/estimate metadata; Cost/SQM = `Grand Total / GFA`, "N/A" until captured | F-10 | Product + DB |
| D4 | **Contractor identity** (F-07) | A workspace/contractor profile (name, address, contact, logo, signatories) feeds the title block; fall back to project/workspace name (never the beta placeholder) | F-07, F-31 | Product |
| D5 | **Scope semantics** (F-08) | Per-row scope field on the estimate row (INCLUDED default), editable; export reads it | F-08, F-29 | Product + DB |
| D6 | **Division taxonomy** (F-27) | Ordered canonical list (Preliminaries → Site/Earth → Civil → Architectural → Finishes → Glass → Doors → Joinery → MEP → FFE → Misc); map free-text category onto it | F-27 | Product |

> **DB-touching decisions: D1, D3, D4, D5, D6** (D4 added — `workspaces` has no `metadata` column, so a contractor profile needs a real migration, unlike GFA/scope). Per project constraints the **DB channel is currently unavailable to agents**. Migration designs are now in **[10_data-model-and-migration-design.md](10_data-model-and-migration-design.md)** (designed; application deferred). **Important nuance from the second pass:** D3 (GFA) and D5 (scope) are **NOT** hard-blocked — `projects`/`estimates`/`estimate_row_items` already carry `metadata: Json` (which the route already reads), so their **read-side ships in P2 via JSONB now**; only the typed-column promotion is channel-gated. P1 has **no** DB dependency by design.

---

## Phasing rationale

- **P1 — Trust, Safety & Presentability (no DB):** the export currently *misleads* (preview≠file, wrong multi-tab total, errors saved as `.xlsx`), is *inaccessible*, and the **downloaded file is not client-presentable** (beta placeholder bidder, LABOR silently 0, internal data shipped under a "client" label). The second pass corrected the original "trust phase that left the file client-unusable": P1 now also lands the **cheap, decision-light presentability fixes** (P1-T9) so a P1-complete file is genuinely sendable. All zero-schema-change. Ship before broad beta.
- **P2 — Format fidelity & control (some decisions):** make the file read like an industry BOQ (VAT, numbering, title block, Cost/SQM) and give the user settings. The credibility blockers users *see in the file*.
- **P3 — Polish & scale (decisions + data):** labor split, real scope/exclusions, branding, caching/worker, formal-bid extras.

---

## Phase 1 — Trust, Safety & Presentability  *(target: before broad/client beta)*

**Objective:** the preview tells the truth, downloads never produce corrupt/confusing artifacts, the modal is accessible, the route is observable and defended, and **the downloaded file is client-presentable** (no beta placeholder, LABOR disclaimer present, no internal-data leak by default).

- [ ] **P1-T1 — Fetch-then-blob download with error handling** *(F-05; also fixes 413/404/500 delivery)*
  Files: `ProposalExportPreviewDialog.tsx` (replace `<a href>` with a button), `EstimateSheetContent.tsx` (download handler). Fetch the route, check `response.ok`/content-type; on success trigger a blob download; on error render the route's `{error, limits}` inline (spinner while generating; disable button while in-flight and for empty/over-limit estimates).
  Accept: 413/404/500 show a friendly inline message; success downloads a valid `.xlsx`; no JSON ever saved as `.xlsx`. Test: dialog test simulating ok + 413 + 500.

- [ ] **P1-T2 — Reconcile preview with the file** *(F-03, F-04/TAB-1, F-20, F-35)* — **gated on D7 + D8; do not start until both are closed.**
  Files: `ProposalExportPreviewDialog.tsx`, `EstimateSheetContent.tsx`. **Default per D7=B:** reframe as a **"Contents summary"** listing the sheets (Bid Form ×N tabs · Summary · Commercial Terms — *flag as boilerplate, review before sending* (F-35) · Source Breakdown — *internal only*). **Default per D8=a:** for all-tabs scope, **hide the single-tab number** and show "All N tabs — total in the downloaded Summary" (other tabs aren't client-loaded and no totals endpoint exists). If D7=A instead, render the real Bid Form columns/section rows derived from a single `BID_FORM_COLUMNS` source of truth (accept the F-22 jank addendum — see note in P3-T5). Surface `validationIssues` as an expandable list.
  Accept: a multi-tab estimate's modal never shows a single-tab total as "Grand total"; the modal names every sheet the file contains and flags Commercial Terms boilerplate. Test: preview test asserting all-tabs total handling + sheet list + Commercial-Terms flag.

- [ ] **P1-T3 — Modal accessibility** *(F-06, F-26)*
  Files: `ProposalExportPreviewDialog.tsx`, `EstimateSheetContent.tsx`. Add Esc-to-close, focus trap, initial focus, focus-return to opener, overlay-click-to-close (reuse `inspectorOpenerRef`/`handleEscape` patterns at `EstimateSheetContent.tsx:1139-1163,970-991`). Raise body text to ≥12px / labels ≥11px; verify contrast.
  Accept: keyboard-only open→navigate→Esc→focus-returns works; axe/contrast check passes. Test: preview test for Esc + focus behavior.

- [ ] **P1-T4 — Route hardening: try/catch + logging + graceful tabs** *(F-13, F-25/TAB-3)*
  Files: `route.ts`. Wrap each `build*Response`; structured log `{estimateId, tabCount, rowCount, durationMs, outcome}`; consistent JSON error shape (consumed by P1-T1). Replace the tab-mapping `throw` with graceful skip; use `Promise.allSettled` so one bad/archived tab doesn't fail the export.
  Accept: a forced DB/ExcelJS error returns a logged JSON 500, not a stack page; a deleted-mid-request tab is skipped with a warning. Test: route test for error + missing-tab paths.

- [ ] **P1-T5 — Explicit fail-closed authz (in-handler 401)** *(F-15)* — **re-spec'd by the second pass; see [11 §D.4](11_qa-and-decision-addendum.md).**
  Files: `route.ts`. Use **`getCurrentUserContext()`** (`src/lib/auth/session.ts:31`, React-`cache`-wrapped, returns `CurrentUserContext | null`) + an **explicit null-check** + **`NextResponse.json({error:"Unauthorized"},{status:401})`** *in the handler*, before any repository call — mirroring the images GET route's in-handler pattern (`images/route.ts:181-182`). **Do NOT** call `requireCurrentUserContext()` (it `redirect("/login")`s → a **307**, which P1-T1's fetch-then-blob cannot render). A `src/middleware.ts` guard is **net-new** (no existing middleware to mirror) and runs the **edge runtime** while this route is `runtime="nodejs"` — **demoted to nice-to-have**, tracked outside this plan.
  Accept: unauthenticated request → **401 JSON** (verified, not 307); cross-tenant ID → 404. Test: route boundary test asserting the 401 status + JSON body.

- [ ] **P1-T6 — Fix single-tab Summary overflow** *(F-16/TAB-5)*
  Files: `create-proposal-workbook.ts`. Unify `createSummaryWorksheet` onto the dynamic `totalsStartRow` approach used by `populateTabbedSummaryWorksheet`.
  Accept: a 15-section single-tab estimate produces a non-corrupt Summary. Test: workbook test with >11 sections.

- [ ] **P1-T7 — Defang CSV/formula injection in data cells** *(F-18)*
  Files: `create-proposal-workbook.ts` (string-cell writer helper). Prefix `'` (or force text type) for any string cell whose first non-space char ∈ `= + - @ \t \r` — particulars, remarks, section/tag labels, area paths, `sourceNodeName`, tab-name cells.
  Accept: a row with `=HYPERLINK(...)` in remarks exports as literal text. Test: workbook test asserting the leading-quote/text type.

- [ ] **P1-T8 — Verify live RLS (release gate)** *(F-17)*
  Ops, when DB channel available: confirm `relrowsecurity=true`, expected `pg_policies`, and `FORCE ROW LEVEL SECURITY` on `projects/estimates/estimate_tabs/estimate_nodes/estimate_row_items`. Document the result in `.ai/10_state/decisions.md` and this folder.
  Accept: documented confirmation or remediation ticket.

- [ ] **P1-T9 — File presentability (DB-free)** *(F-07 partial, F-01 P1 mitigation, F-19 minimal redaction)* — **added by the second pass; the "trust phase" must leave the file sendable.**
  Files: `create-proposal-workbook.ts`, `route.ts` (`buildMetadata`), `build-…`. (a) **Remove the beta placeholder** — replace `"Archestimator beta workbook"` bidder with a clean fallback (project/workspace name, or blank); no decision needed. (b) **F-01 in-file disclaimer** — a visible NOTES/caveat row "LABOR not yet captured — material-only pricing" on Bid Form/Summary so LABOR=0 never silently implies labor is priced. (c) **Minimal client redaction** per D0=A — until P2-T3 lands, when the (server-default) audience is client, **drop the Source Breakdown sheet + supplier/confidence fields**, OR (if D0≠A) flip the default to `internal` ([11 §D.3](11_qa-and-decision-addendum.md)). Owner/Client from `projects.client_name` (DB-free) may also land here or in P2-T4.
  Accept: no file contains the beta placeholder; LABOR=0 carries a visible disclaimer; a default-audience download does not leak Source Breakdown/supplier/confidence. Test: workbook test for placeholder absence + disclaimer row + default redaction.

- [ ] **P1-T10 — Export rate limit** *(security MEDIUM; [11 §C.5](11_qa-and-decision-addendum.md))*
  Files: `route.ts`. Add a per-user limit on the export route (heaviest endpoint: per-tab DB fan-out + ExcelJS build) mirroring `checkAiAskQuota` (`src/lib/ai/rate-limit.ts`) / `checkProjectPublicationSnapshotRateLimit`. Reuse an existing limiter shape; do not invent a new one.
  Accept: exceeding the limit returns a clean 429 JSON (rendered by P1-T1). Test: route test hitting the limit.

**Exit criteria P1:** preview can no longer mislead (names every sheet; no wrong total); no path produces a corrupt download; modal is keyboard-accessible; route logs, rate-limits, and fails closed with a **401**; injection defanged; **the file is client-presentable** (no placeholder, LABOR disclaimer, no default internal-data leak); RLS confirmed. All 7 existing proposal tests still green + new tests above.

---

## Phase 2 — Format fidelity & control  *(needs D0, D2; D3/D5 ship read-side via JSONB; D4 contractor-half gated)*

**Objective:** the downloaded file reads like an industry BOQ and the user controls the output. Build to [09_target-format-spec.md](09_target-format-spec.md).

> **All P2 format tasks build to the cell/formula map in [09_target-format-spec.md](09_target-format-spec.md)** — use it as the fixed target so the Summary/Bid Form geometry stays consistent across P2-T1/T4/T5/T6/T8.

- [ ] **P2-T1 — VAT + contingency totals** *(F-02; D2)* — Files: `create-proposal-workbook.ts` (Summary totals block, both single+tabbed), `types.ts`/`build-…` (settings `vatRate`, `contingencyRate`, `vatMode`/`contingencyMode`). Compute Direct Cost → Contingency (%/INCLUDED) → VAT 12% (%/INCLUDED) → Grand Total **to the exact cell map in [09](09_target-format-spec.md)**. Accept: Grand Total includes VAT+contingency and matches a hand calc against a reference file pattern.
- [ ] **P2-T2 + P2-T3 — Settings plumbed end-to-end + real `audience` gate (ONE atomic unit)** *(F-11, F-12, F-19; security preconditions [11 §C](11_qa-and-decision-addendum.md))* — Files: `route.ts` (read settings), `ProposalExportPreviewDialog.tsx`/`EstimateSheetContent.tsx` (settings panel — IA per [11 §D]; anchor/interaction-on-change/numeric-input types must be specified before build), `build-…`. Expose include/exclude Source Breakdown, include excluded/zero rows, VAT/contingency %, `includeFormulas`. **Security preconditions (mandatory, not optional):** (i) **`audience` is server-derived from the caller's role — NEVER read from query/body** (else a viewer forces `audience=internal` to exfiltrate Source Breakdown); (ii) `vatRate`/`contingencyRate` validated as finite within 0–100 → **400** otherwise (no silent clamp); (iii) booleans via explicit allow-list. **Ship expose+enforce together** so no audience toggle reaches users without working redaction (avoids re-creating F-12). Implement `includeFormulas` for real; remove or clearly defer `mode`/`area-breakdown`. Accept: changing a setting changes the file; a client-supplied `audience` is ignored; out-of-band rate → 400; client export contains no internal fields. Test: route test for `audience` tampering + rate bounds; redaction test.
- [ ] **P2-T4 — Title block completion** *(F-07; **Owner/Client DB-free, contractor identity gated on D4**)* — Files: `create-proposal-workbook.ts`, `route.ts` (`buildMetadata` + add `client_name` to the `ProposalExportProject` pick at `route.ts:22`), `types.ts`. **DB-free now:** Owner/Client from `projects.client_name` (column exists at `types.ts:2893`, just unselected), Project Ref/Code (`projectCode`), Address, Subject. **D4-gated:** contractor identity (bidder name/logo/signatories) — needs the `workspaces` migration in [10](10_data-model-and-migration-design.md); until then fall back to project/workspace name (the beta placeholder is already removed in P1-T9). Accept: Owner/Client populated from `client_name`; no placeholder strings; contractor identity populated or cleanly blank. Cell layout per [09](09_target-format-spec.md).
- [ ] **P2-T5 — Hierarchical numbering** *(F-09)* — Files: `build-…` (`renumberProposalRows` → section-prefixed `A`/`1`/`1.1`), `create-…`. Algorithm + worked examples in [09](09_target-format-spec.md). Accept: items numbered per section with division prefix; subtotals reference correct ranges.
- [ ] **P2-T6 — Cost per SQM** *(F-10; D3 — **read-side ships via `estimates.metadata` JSONB now, no DB channel**)* — Files: `types.ts` (metadata `grossFloorArea` read from `estimates.metadata`), `create-…` (Summary formula `Grand Total / GFA`). Accept: Cost/SQM computes when GFA present in metadata; "N/A" otherwise. See [10](10_data-model-and-migration-design.md) for the JSONB-now vs typed-column-later path.
- [ ] **P2-T7 — All-tabs DB de-duplication + early 413** *(F-14/TAB-2, F-24/TAB-4)* — Files: `route.ts`, `workspace-repository.ts`. Add a **NEW additive** repo function `getEstimateTreesForTabs(projectId, estimateId, tabIds, limits)` that batch-fetches per-tab nodes+rows (or 2 bulk `estimate_id`-grouped queries), **preserving the `LIMIT max+1` over-fetch guard** so `didExceedExportLimit` still works — **net-new, no existing signature change** (resolves the Risks tension). Note `getCurrentWorkspaceProject` is already React-`cache`-wrapped (`workspace-repository.ts:1062`), so workspace/project re-resolve is *already* deduped per request — the real fan-out to fix is per-tab nodes+rows. Accumulate counts and short-circuit oversize. Accept: 10-tab export issues ~3 (not ~50) nodes+rows queries; over-limit rejects before full fetch. Test: query-count assertion / mock spy.
- [ ] **P2-T8 — Builder unification + formula robustness + constants** *(F-21, F-32, F-33)* — Files: `create-…` (merge single/tabbed Summary + Source Breakdown; derive formula column letters from keys), `route.ts` (UUID-validate `estimateId`/`tab` → 400; add `nosniff`; centralize limit + `legacy-main` constants). Accept: one Summary/Breakdown builder; reordering columns can't silently break formulas (guard test); malformed IDs → 400.

**Exit criteria P2:** a generated file is visually and numerically comparable to the reference BOQs (VAT, numbering, title block, Cost/SQM), settings are real, all-tabs is efficient, and the duplicated builders are unified.

---

## Phase 3 — Polish & scale  *(needs D1 + D6 + typed-column promotion of D3/D5 — all DB-channel-gated; designs in [10](10_data-model-and-migration-design.md))*

- [ ] **P3-T1 — Real Material/Labor split** *(F-01; D1)* — add labor unit cost (or ratio) to source data + model; populate `laborUnitCost`. Until data lands, keep the visible material-only disclaimer.
- [ ] **P3-T2 — Real scope + EXCLUSIONS block** *(F-08, F-29; D5)* — wire per-row scope into `scopeStatus`; render excluded rows as a numbered EXCLUSIONS block; expand vocabulary + legend.
- [ ] **P3-T3 — Canonical division order** *(F-27; D6)* — map category/discipline onto the ordered taxonomy; Preliminaries first.
- [ ] **P3-T4 — Formal-bid extras** *(F-28, F-30, F-31, F-34)* — Grand Total in words; construction duration; contractor branding header; accounting-aligned peso format; `RUNNING TOTAL` / weighted-% columns (optional).
- [ ] **P3-T5 — Performance/scale** *(F-22, F-23, F-34)* — preview loading state / Web Worker; revision-keyed ETag cache or preview-model reuse; explicit `maxDuration`; wire `bench:proposal-workbook` script as a regression gate; adopt `stream.xlsx.WorkbookWriter` only if caps rise.

**Exit criteria P3:** the file is a fully formal, industry-grade BOQ; large/repeat exports are fast; perf is regression-guarded.

---

## Test strategy

- **Unit (model):** settings effects (audience, VAT/contingency, scope, numbering), rounding parity, division ordering.
- **Workbook:** VAT/contingency totals, hierarchical numbering, >11-section Summary, injection defang, unified builders, formula column-derivation guard.
- **Route:** error/logging paths, `allSettled` tab skip, **401 authz (status + JSON, not 307)**, `audience`-tampering ignored, rate-bounds 400, **429 rate limit**, UUID 400, query-count for de-dup, early 413.
- **Preview (RTL):** all-tabs total handling, sheet-contents claims (incl. Commercial-Terms boilerplate flag), Esc/focus a11y, error-state rendering.
- **Regression:** keep all 7 existing proposal tests green; update assertions only where behavior intentionally changed (note each).
- **Perf:** `bench:proposal-workbook` thresholds (≤~1 s / ≤~1 MiB at cap).
- **Manual (release gate):** the cross-app recalc checklist in [11 §A](11_qa-and-decision-addendum.md) — open generated single-tab + multi-tab files in Excel/Sheets/LibreOffice and verify formulas recalc, cross-sheet refs resolve, accounting format renders, and the injection defang shows literal text. **No automated layer covers this.**

## Risks & rollback

- **Low blast radius** for model/workbook/route changes (route + preview only) — see [05 Part B](05_security-and-blast-radius.md). **Do not change the three repository function *signatures*** (cross-cutting); **adding** a new function (e.g. P2-T7's `getEstimateTreesForTabs`) is fine and is the intended way to de-dup without touching existing callers. Vercel instant rollback is available.
- **DB-dependent tasks:** **D1, D4** (and the typed-column promotion of D3/D5) are blocked on the DB channel — designs in [10](10_data-model-and-migration-design.md), application deferred. **D3 (GFA) and D5 (scope) read-side are NOT blocked** — they ship via existing `metadata: Json` columns in P2. Keep P1 fully DB-free so trust/safety/presentability ship immediately.
- **Test brittleness:** existing tests assert current (hollow) behavior; intentional changes will require assertion updates — call them out per task, don't blanket-skip.

## Self-review (spec coverage) — corrected after second pass

- **CRITICAL/HIGH coverage:** every CRITICAL/HIGH finding has a P1 *or P2* task **or a P1 interim mitigation**. Specifically corrected from the first draft: **F-35** (hidden sheets / unreviewed Commercial Terms — was the orphaned UX-3) is now a finding with a P1 task (P1-T2/P1-T9); **F-01** (CRITICAL, real fix is P3/data-gated) now has a **P1 in-file disclaimer** (P1-T9) so it does not ship silently. No remaining CRITICAL/HIGH is unmapped. *(The first-pass claim "every CRITICAL/HIGH maps to a P1/P2 task" was false on these two counts — fixed here.)*
- **MEDIUM/LOW:** mapped to P2/P3 per [07](07_findings-register.md).
- **Decisions:** D0–D8 gate the data/format/UX tasks; D7 specifically blocks P1-T2. Migration designs delivered in [10](10_data-model-and-migration-design.md) (the first-pass "design migrations here" was a promise not yet kept — now kept).
- **No task references an undefined model field.** Format target is the cell/formula map in [09](09_target-format-spec.md), grounded in the 10-file benchmark ([02](02_boq-format-benchmark.md)).
- **Tabs requirement** ([06](06_tabs-multisheet-audit.md)) is satisfied (already works); TAB-1/2/3/4/5 map to F-04/F-14/F-25/F-24/F-16.
- **Core promise (formulas recalc on open)** is gated by the manual cross-app QA checklist in [11 §A](11_qa-and-decision-addendum.md) — no automated layer covers it.
