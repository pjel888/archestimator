# 07 — Functional Defects & Completeness (Truth & Integrity)

**What this is:** The reality-vs-claim reckoning. The upstream completion audit (`.ai/05_logs/2026-06-12-estimate-tabs-implementation-completion-audit.md`) reports the estimate-tabs / templates-unification work as merge-ready with "denial scenarios 1–9 proven". This document shows, with live and code evidence, that the **"Projects Auto-Added To Templates" capability is browse-only and partially broken in the live environment**, and that key claims are overstated.

Severity legend: **P0** = user-facing broken in prod · **P1** = serious gap/defect · **P2** = correctness/quality · **P3** = polish.

---

## DEF-1 (P0) — Project-source outline load 500s in the live app

**Reproduced live (twice).** On the estimate page, expanding a project ("Lewis Residence") returns its estimates (server action → 200), but expanding **any** estimate to load its outline returns **HTTP 500**, and the panel renders the raw error: *"Couldn't load estimate outline. {code: …, details: Null, hint: …, message: …}"*. Both ES-001 and ES-002 failed → **general failure**, not data-specific.

**Root cause (fully triangulated):**
1. The `estimate_tabs` table is **not applied to the live DB** (live `list_migrations` ends `20260606095935`; `pg_class` shows `estimate_tabs` absent — see [05](05_DATABASE_RLS_SECURITY_AUDIT.md) DB-1). The migration `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:2` is explicitly "local-only until owner-authorized apply".
2. `getReusableEstimateOutline` (`reusable-sources/actions.ts:190`) calls `getEstimateTabs` (`workspace-repository.ts:1691`) then `getEstimateTabTree` (`:1731`). Both query `estimate_tabs` and **`throw error`** on any failure (`:1703, :1713, :1748, :1759, :1773, :1786`) with **no schema-missing fallback**.
3. Their sibling loaders `getProjectEstimateTreeByEstimate`/`getProjectEstimateTreeByNode` **do** catch the missing-table error via `isEstimateTabsSchemaMissing(...)` (`:1824, :1846, :1866, :1917`) and fall back to a legacy single-tab loader — which is why the **editor's own tree renders** (the synthetic "Main" tab seen live) while the reusable path 500s.
4. Result: a Postgres `42P01` ("relation `public.estimate_tabs` does not exist", `details: null`) propagates unhandled → server-action 500 → leaked raw error banner. The `42P01`/`details:null` shape matches the observed banner exactly.

**Why tests didn't catch it:** `tests/vitest/reusable-sources-actions.test.ts` mocks the Supabase client, so the outline path passes in CI while 500ing against the real (unapplied) DB. The failure lives precisely in the gap between mocked unit tests and the unapplied migration.

**Two valid fixes (see [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U1):** (a) add the `isEstimateTabsSchemaMissing` fallback to `getEstimateTabs`/`getEstimateTabTree`/`getDefaultEstimateTab` so the reusable path degrades to legacy like its siblings (contained, no provider action); and/or (b) owner-authorize applying `20260612094734` + regen types (broader — flips many coupled surfaces, see [06](06_BLAST_RADIUS_ANALYSIS.md)). Recommended: ship (a) immediately, schedule (b) deliberately.

**Pairs with UX-6** ([02](02_UX_UI_AUDIT.md)): regardless of root cause, the UI must map server errors to user-safe text and never surface `{code, hint, message}`.

---

## DEF-2 (P1) — The project-source → estimate insert path was never built

The headline capability — "insert a project-derived source (tab / group / area) into the current estimate" — **does not exist as executable code**. Verified by repo-wide grep (0 hits each):

- **No RPC** `insert_estimate_subtree_into_estimate_with_history` (the origin plan's Phase-5 SECURITY DEFINER RPC) — not in any migration, not in `src/`.
- **No server action** `insertProjectSourceIntoEstimate` — `reusable-sources/actions.ts` contains only read actions (list/list-estimates/search/outline).
- **No audit event** `project_source_inserted` — never emitted.
- **Dead UI seam:** `onInsertProjectSource` is consumed (`component-library/index.tsx:1368`) but **never supplied** by any parent → permanently `undefined` → `addProjectSource` (`:1361-1378`) always reports "was not inserted". The menu item is disabled with `disabledReason` = "Project source insertion is not wired in this surface yet" (`tree/TemplatesTree.tsx:819`).
- **Dead drag path:** drag-start writes a project-source payload (`index.tsx:1860`) and the tab strip recognizes the MIME type for spring-load (`src/components/workshop/estimate-sheet/EstimateTabStrip.tsx:57`), but `readProjectSourceDragPayload` has **no consumer** — no tree drop handler reads it, so a dropped project source does nothing. (Contrast `readEstimateTemplateDragPayload`, consumed in 4 drop handlers.)

The only way project content reaches an estimate today is **template-first**: save the source as a custom template (`createEstimateTemplateFromEstimateNode`, `actions.ts:672`), then insert the template.

---

## DEF-3 (P1) — Route-browse project sources are inert

On `/workshop/library/templates`, project sources expand/collapse (and lazily load) but offer **no** select, preview, context menu, or drag. **Confirmed live** (clicking "Lewis Residence" left the gallery showing only the 3 custom templates; right-click produced no menu). Evidence: `TemplatesBrowseManager.tsx:288-290` (`handleRowClick` ignores `project-source`), `:343` (empty context menu), `:933` (preview only for `selectedTemplate`), `project-source-browse-tree.tsx:227-257` (`draggable:false`). Detail in [02](02_UX_UI_AUDIT.md) UX-1/UX-2.

**Resolution (D-C, 2026-06-13):** rather than make these rows interactive, the owner decided project sources should **not appear on the library route at all** — only in the in-estimate panel. The fix is **removal** ([08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U3), which dissolves DEF-3 and UX-1/UX-2 and removes the route's reusable-source query/perf surface. The library route becomes template-class only (custom + future supplier).

---

## DEF-4 (P1, = SEC-1) — Live template-insert RPC privilege gap

The live `insert_estimate_template_into_estimate_with_history` (SECURITY DEFINER, granted to `authenticated`) authorizes on **workspace membership only**, not `can_edit_estimate` — a workspace-member *viewer* on a restricted estimate can insert content. The hardened gate (`assert_can_edit_estimate_for_history`) exists only in the unapplied migration. Full analysis in [05](05_DATABASE_RLS_SECURITY_AUDIT.md) SEC-1/SEC-2.

---

## DEF-5 (P1) — The completion audit overstates reality

`.ai/05_logs/2026-06-12-estimate-tabs-implementation-completion-audit.md` and `13_REQUIREMENTS_TRACEABILITY_MATRIX.md` (in the archived pack) claim "denial scenarios 1–9 proven" and mark **R7.2** ("insert verifies target edit + source read + same workspace") as implemented, citing `20260522091621:250-262` + `assertCanEditEstimate`.

Reality:
- That migration defines the **template** RPC, **not** a project-source insert RPC (DEF-2).
- Denial scenarios **4–7** for project sources are **untestable** because the insert they guard does not exist — yet the audit restates R7.2 as proof of them.
- The cited `assertCanEditEstimate` guard is **not called** in the template-insert actions `insertEstimateTemplateIntoEstimate` / `wrapEstimateAreaAndInsertTemplate` — the helper exists (`actions.ts:345`, used by `detachEstimateRowItemFromLibrary:2606`) but the insert path doesn't invoke it (DEF-4 / [05](05_DATABASE_RLS_SECURITY_AUDIT.md) SEC-2).
- The green `validate` run (243 files / 1808 tests) is genuine, but the project-source insert feature contributes **no failing tests because it has no executable code** — "green by omission".

The RTM's own footnotes are more honest than its summary: R4.2 and R6.2 self-document the insert as "remains R7.2" (i.e., a UI seam), while the completion audit elevates it to "proven".

---

## DEF-6 (P2) — Test coverage gaps

**Genuinely covered (verified):** the M1 migration (tabs table/RLS/indexes/backfill, `estimate-tabs-schema.test.ts`), the editor tab strip (a11y/keyboard/spring-load/D-15 gate, `estimate-tab-strip.test.tsx`), tab-aware XLSX export incl. single-tab byte-shape + worksheet-name sanitizer (`proposal-worksheet-name.test.ts`, `proposal-workbook.test.ts`), and read/browse/search/outline for project sources (mocked, `reusable-sources-actions.test.ts`).

**Gaps:**
- **Denial scenarios 4–7** (forged viewer insert, unreadable source, cross-workspace, deleted-source typed error) — untestable until the insert path exists; the planned `project-source-insert-action.test.ts` was never created.
- **Application-layer denial for scenarios 1–3** — only RLS-table read scoping is proven in the harness; no test asserts `getReusableEstimateOutline` returns empty/denied for a non-member.
- **Denial 8** (anonymous export → redirect) — no in-route auth assertion test.
- **DEF-1 itself** — no integration test exercises the unmocked outline path against a real (or migration-applied) DB; this is the exact blind spot.
- **e2e** — `e2e/estimate-tabs.spec.ts` covers 1 of 8 planned scenarios and is env-gated (skipped in the closeout run).
- **Collaboration/snapshot edges** — cross-tab cursor isolation and v1.1-vs-v1.2 snapshot rendering are claimed in run logs but have no dedicated automated test.

**Pre-existing red baseline (do not conflate):** `.ai/10_state/current-state.md` documents a pre-existing failing baseline (landing-page tests, homebase greeting, etc.) unrelated to Templates. None of the above gaps are that baseline.

---

## Reality-vs-claim summary

| Capability | Claimed | Reality | Evidence |
|---|---|---|---|
| Estimate multi-tab schema | shipped/merge-ready | **local-only, not applied to live DB** | DB-1 |
| Browse projects as template sources | works | works at the **list** level; **outline 500s** in live app | DEF-1 |
| Insert a project source into an estimate | "R7.2 implemented", denials proven | **not built** (no RPC/action/event, dead UI + drag seams) | DEF-2 |
| Route-browse project sources usable | unified | **inert** (no preview/menu/drag) | DEF-3 |
| Insert authorizes `can_edit` | claimed | live RPC checks workspace membership only | DEF-4 |
| Denial scenarios 1–9 proven | yes | overstated: project-source scenarios 4–7 are untestable (no insert path); for custom templates 6–8 hold and 1–3 & 9 are harness/at-risk pending the live apply | DEF-5, [05](05_DATABASE_RLS_SECURITY_AUDIT.md) |
| Tab-aware XLSX export | shipped | **genuinely shipped + tested** | DEF-6 |

---

## Evidence used

Live browser (authenticated, `localhost:3000`): outline 500 reproduced on ES-001 and ES-002; route-browse inert sources. Live DB: `list_migrations`, `pg_class`, `pg_proc`. Code: `reusable-sources/actions.ts:190`, `workspace-repository.ts:1691-1804` + fallbacks `:1824-1917`, `component-library/index.tsx:1361-1378,:1860`, `tree/TemplatesTree.tsx:819`, `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx:57`. Grep: 0 hits for `insert_estimate_subtree_into_estimate_with_history`, `insertProjectSourceIntoEstimate`, `project_source_inserted`, `onInsertProjectSource=` (supplier), `readProjectSourceDragPayload` (consumer). Docs: archived `13_REQUIREMENTS_TRACEABILITY_MATRIX.md`, `.ai/05_logs/2026-06-12-estimate-tabs-implementation-completion-audit.md`.

## Truth & integrity

- **VERIFIED:** DEF-1 (live + code-triangulated), DEF-2 (grep 0-hits + dead seams), DEF-3 (live + code), DEF-4 (live `pg_proc`), DEF-5 (doc vs code), DEF-6 (test inventory + the mock that hides DEF-1).
- **ASSUMPTION / manual-proof-pending:** the exact `42P01` code string for DEF-1 is inferred from the error shape + confirmed-missing table (a dev-server log capture would confirm); denial scenarios 1–3/9 against the live DB are unproven (no two-user harness run here).
