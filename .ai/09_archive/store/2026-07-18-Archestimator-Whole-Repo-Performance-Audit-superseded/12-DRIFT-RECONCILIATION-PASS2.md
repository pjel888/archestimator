# 12 — Drift Reconciliation, Pass 2

**Pass type:** READ-ONLY reconciliation of the first-pass audit (authored against HEAD `a41a07d0`) against the current repo HEAD `24b15e8`.
**Date:** 2026-07-18.
**Scope:** (a) drift summary between the two SHAs, (b) per-finding re-verification of all 16 actionable findings in `05-FINDINGS-REGISTER.md`, (c) impact of concurrent `src/lib/` sibling edits (laborUnitCost removal) on the audit, (d) any new performance-relevant surfaces introduced by the drift.

---

## (a) Drift Summary

### Commits between the two SHAs

`git log --oneline a41a07d0..24b15e8` returns exactly **8 commits**, ALL of them `docs(ai):` commits:

| SHA | Subject |
|---|---|
| `a8b3acd0a` | docs(ai): add whole-repo performance audit baseline pack |
| `6a7ac2a4d` | docs(ai): add whole-app consistency audit plan pack |
| `0b983f996` | docs(ai): add runtime and dataflow map to performance audit pack |
| `3dde6495c` | docs(ai): complete performance audit pack with findings, roadmap, and budgets |
| `56ad2b75c` | docs(ai): finish performance audit pack with summary, README, and run artifacts |
| `bd959c300` | docs(ai): update performance audit findings register and machine-readable findings |
| `d697ba7e0` | docs(ai): refine performance audit baseline methodology and pack README |
| `24b15e829` | docs(ai): revise performance audit optimization roadmap and executive summary |

### Files touched by the commits

`git diff --stat a41a07d0..24b15e8` shows the deltas are **entirely inside `.ai/`** (the two plan packs — this performance-audit pack, and the sibling consistency-audit pack). **Zero source files, zero worker files, zero scripts, zero `.github/` config, zero `package.json`/`tsconfig.json`/`next.config` changes were committed between the two SHAs.** Verification:

```
git diff --stat a41a07d0..24b15e8 -- 'src/' 'worker.ts' 'scripts/' '.github/' 'package.json' 'tsconfig.json'
→ empty
```

### Uncommitted working-tree changes (the "concurrent sibling edits")

The laborUnitCost removal referenced in the task brief is **NOT in the commit history between the two SHAs**. It is an **uncommitted working-tree modification** produced by the sibling plan pack `2026-07-18-Whole-App-Consistency-Audit` while it executes. Current `git status` shows 12 modified files (no staging):

| File | Net change |
|---|---|
| `src/lib/ai/read-context.ts` | −1 |
| `src/lib/estimates/estimate-row-total.ts` | −18 / +3 |
| `src/lib/estimates/estimate-tree-read-repository.ts` | −2 |
| `src/lib/estimates/types.ts` | −3 / +2 |
| `src/lib/project-charts/aggregate-project-charts.ts` | −1 |
| `src/lib/project-charts/types.ts` | −1 |
| `src/lib/proposal-export/build-proposal-export-model.ts` | −27 / +1 |
| `src/lib/proposal-export/create-proposal-workbook.ts` | −36 / +7 |
| `src/lib/proposal-export/types.ts` | −9 |
| `src/lib/publication/authoring-projection.ts` | −3 |
| `src/lib/publication/snapshot.ts` | −2 |
| `src/lib/repositories/project-charts-repository.ts` | −2 |

**Totals: +14 / −106** — an overwhelmingly subtractive change (field stripping). It is the mechanical removal of the `laborUnitCost` / `labor_rate` / `laborMinorUnits` / `laborSubtotal` field family from estimate types, proposal-export types, project-charts types, and the publication snapshot.

**Headline conclusion for (a):** Between the baseline and the current HEAD, no source, config, build, worker, or script file changed at all. The only code-level drift is the uncommitted laborUnitCost-removal working tree, which is purely subtractive and introduces zero new D1 queries, zero new providers, zero new hot paths.

---

## (b) Per-Finding Re-Verification

Re-verification convention: each finding is graded **Still holds** (cite current file:line), **Changed shape** (describe drift, new file:line), **Fixed** (cite resolving code/commit), or **Stale assumption** (a premise is no longer true).

| ID | Status | Current evidence (HEAD `24b15e8` + working tree) |
|---|---|---|
| **PERF-CI-001** | **Still holds** | `.github/workflows/` is still empty (`ls` shows only `.` and `..`). Archived workflows still live in `.github/workflows-disabled/{ci.yml,codeql.yml,dependabot.yml,react-doctor.yml,2026-07-13/}`. `README.md:384` still reads verbatim: *"GitHub Actions (`.github/workflows/ci.yml`): triggers on PRs and pushes to `main`/`feat/*`. Runs `bun install --frozen-lockfile` → `bun run validate` → `bun run build` → Playwright smoke."* Archive commit `25c117184` still the root cause. No change. |
| **PERF-OBS-001** | **Still holds** | `src/components/web-vitals-collector.tsx` (still 172 lines) — per-metric `postMetric` at `:73,100,121,130,145`; `visibilitychange` handler at `:156` calls `reportCls`/`reportInp` (`:152-153`); `pagehide` listener at `:157-160` calls them **again**; cleanup at `:162-168` removes only `visibilitychange` (line 167) and **still does NOT remove the `pagehide` listener** (the documented leak persists). Endpoint `src/app/api/internal/web-vitals/route.ts:55` still calls `recordWebVitalEvent` (1 INSERT per POST). No change. |
| **PERF-AUTH-001** | **Still holds** | `src/lib/auth/better-auth-cloudflare.ts:318` still passes `disableCookieCache: true` to `auth.api.getSession`. `src/lib/auth/session.ts:65-77` still issues 2 sequential D1 reads after session (closed-beta at `:65-71`, profile at `:75-77`); `cache()` wrapper still at `:98` (intra-request only). No change. |
| **PERF-CRON-001** | **Still holds** | `worker.ts:216-223` (ok) and `:226-233` (error) in the `*/5` drain still both call `recordCronRunEvent` unconditionally; the `30 3 * * *` retention branch still issues two `recordCronRunEvent` calls (`:283` and `:293`). `recordCronRunEvent` at `src/lib/admin/observability-repository.ts:240-279` still does an unconditional `INSERT INTO cron_run_events` whenever `db` resolves. No change. |
| **PERF-D1-001** | **Still holds** | `src/lib/estimates/d1-intents/rows.ts` is **unchanged by the sibling diff** (`git diff --stat` empty). `Promise.all(restoredRowIds.map(rowId => readRowById(...)))` at `:3186-3192`; `readRowById` at `:1697-1703` still single-row `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id = ? LIMIT 1`; batched fresh-restore path still at `:3281-3285` (`id IN (${placeholders})`). See §(c) for the `estimate-row-total.ts` interaction — it does NOT affect this finding's cost analysis. |
| **PERF-D1-002** | **Still holds** | `src/lib/activity/activity-outbox.ts:105-157` unchanged. `limit = Math.min(options.limit ?? 100, 500)` at `:111`; per-row `SELECT` (`:127-132`) + per-row `UPDATE` (`:136-140` delivered OR `:146-151` failed) inside the `for` loop. Called only from `worker.ts:273` in the daily retention branch. No change. |
| **PERF-D1-003** | **Still holds (citation drift — minor)** | The scan loop is now at `src/lib/repositories/component-library-repository.ts:562-575` (register cited `561-575` — off by one, immaterial). `ORDER BY category ASC, name ASC` + `LIMIT ? OFFSET ?` paginated while-loop still present. The recommended cursor index `idx_cost_library_items_active_browse_cursor` from migration `0083` (`migrations/0083_component_library_browse_cursor_index.sql`) still does **not cover** `(category, name)`. **However, the register's secondary citation `migrations/0026_cost_library_indexes.sql:67-73` is WRONG** — no file by that name exists. The actual `migrations/0026_*` file is `0026_component_promotion_support.sql` (a different migration). See §(c). The finding's substantive claim remains correct; the migration citation must be corrected. |
| **PERF-D1-004** | **Still holds** | `src/lib/component-library/template-propagation-d1.ts:470-520` unchanged. Component-source guard (`:472-502`) and row-revision guard (`:503-519`) still issue the nested `json_each` + ~15 `json_extract` correlations across `cost_library_items` / `cost_library_item_price_options` / `cost_library_item_variant_cost_entries`. No change. |
| **PERF-CRON-002** | **Still holds** | `src/lib/cloudflare/global-presence.ts` — `broadcastTimer` declared at `:74`; `webSocketClose` (`:144-147`) and `webSocketError` (`:149-152`) call `broadcastPresenceCount` then `ws.close()` and **do not** `clearTimeout(this.broadcastTimer)`. `schedulePresenceCountBroadcast` at `:187-193` only clears within the next schedule. Singleton DO hibernation still defeated. No change. |
| **PERF-RT-001** | **Still holds** | `grep -rn 'bufferedAmount' src/lib/cloudflare/` → empty. `sendJson` helpers still at `collaboration-room.ts:84-90`, `global-presence.ts` (matches `:63-69` region), `support-inbox.ts`; all still fire-and-forget `ws.send` then `ws.close(1011, "..._send_failed")` on throw. No change. |
| **PERF-FE-001** | **Still holds** | `src/components/workshop/estimate-sheet/rows/row-table.tsx` — inline `style={{ left:0, position:"absolute", top:0, transform: translateY(...), width:"100%" }}` object literal still constructed inside `virtualItems.map(...)` at `:1309-1317` (register cited `1309-1315`; the literal runs to `:1317`, immaterial). `EstimateRowItemTableRow` still `memo(...)` with default shallow compare at `:307`. Second inline-style spread at `:619`. Custom outer comparator at `:120-156` does not protect the inner row. No change. |
| **PERF-FE-002** | **Still holds** | `src/app/layout.tsx:39` still renders `<AppProviders>{children}</AppProviders>` in the root layout. `src/app/providers.tsx:31-49` still composes all 8 providers globally (`QueryClientProvider` → `ToastProvider` → `NotificationProvider` → `BfcacheHandler` + `PerformanceMonitor` + `NavigationListener` + `RealtimeAuthBridge` + `WebVitalsCollector` + `RouteLoadingOverlay`). `src/features/notifications/components/NotificationProvider.tsx:6` still statically imports `ReleaseAnnouncementModal`. No change. |
| **PERF-FE-003** | **Still holds** | `src/hooks/use-estimate-row-update-broadcast.ts` (178 lines) unchanged. `shouldApplyEstimateRowUpdateBroadcast` exported at `:77`; `useEstimateRowUpdateBroadcast` exported at `:91`. Grep across `src/` finds **zero callers** outside the file itself. Still dead code shipped to the bundle. No change. |
| **PERF-EXP-001** | **Still holds (after sibling edit re-check)** | Double-buffer copy still present at `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:128-131`: `function createXlsxResponse(buffer, filename)` → `const body = new ArrayBuffer(buffer.byteLength); new Uint8Array(body).set(buffer); return new Response(body, {...})`. Custom OOXML STORE-mode writer at `src/lib/proposal-export/xlsx-workbook.ts`: the local file header at `:613` writes `writeUInt16(header, 8, 0)` (compression method = 0 = STORE/no compression) and GP flags `0x0800` at `:616` (no deflate bit). **Note:** the register's citation of lines `230,613,662,684` for STORE-mode is loose — the only line that actually evidences STORE is `:613` (method field = 0); `662` is the `createZip` function start, `684` is `writeWorkbookBuffer`, `230` is inside the `Workbook` class decl, `775-778` is past EOL of the file. The substantive claim (STORE-mode, no deflate) is correct; the line set is imprecise. See §(c) for the `create-proposal-workbook.ts` sibling-edit interaction — the finding still holds. |
| **PERF-PUB-001** | **Still holds** | `src/lib/publication/actions.ts` — `mapWithBoundedConcurrency(allowedRecipients, SHARED_LINK_RECIPIENT_ADD_CONCURRENCY, ...)` at `:1552`; `await sendSharedLinkRecipientInvitationEmail({...})` inline at `:1586` inside the iteration; same pattern in `resendSharedLinkRecipientEmail` at `:1712`; `SHARED_LINK_RECIPIENT_ACTION_LIMIT = 50` at `recipient-limits.ts:1`. No change. |
| **PERF-DOC-001** | **Still holds (STALE)** | All four scripts still present and still reference Supabase/Postgres: `scripts/collect-live-db-performance-evidence.ts`, `scripts/audit-dbidx-repo.ts`, `scripts/explain-estimate-list-summaries.mjs` (all match `supabase\|psql\|linked`). `scripts/measure-workshop-dashboard-query-count.ts:19` still declares `supabaseRoundTrips?: number;` and `:64` still reads `snapshot.databaseRoundTrips ?? snapshot.supabaseRoundTrips ?? 0`. No change. |
| **PERF-DOC-002** | **Still holds (STALE)** | `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` — `:25` still "Vercel Functions have 60s max (Hobby)"; `:183` still lists `@supabase/ssr` as "Acceptable in main bundle"; `:226` still calls `security_rate_limit_events` a "Postgres table". No change. |

### Summary count for §(b)

| Re-verification outcome | Count |
|---|---:|
| Still holds (no change) | 15 |
| Still holds (citation drift, immaterial) | 1 (PERF-D1-003 — line `561→562`) |
| Changed shape | 0 |
| Fixed | 0 |
| Stale assumption | 0 |

All 16 actionable findings remain valid against current HEAD + working tree. No finding was invalidated, weakened, or made stale by the drift. Two findings have **citation imprecision** that should be corrected in a future register revision (see §(c)):

- PERF-D1-003: cited migration file `migrations/0026_cost_library_indexes.sql` **does not exist** — the real file is `migrations/0026_component_promotion_support.sql`; the supporting evidence should instead cite `migrations/0083_component_library_browse_cursor_index.sql` (which does exist and confirms the missing `(category, name)` covering index).
- PERF-EXP-001: the STORE-mode line list `xlsx-workbook.ts:230,613,662,684` is loose; the only line that actually proves STORE-mode is `:613` (method field = 0).

---

## (c) Impact of Concurrent `src/lib/` Sibling Edits (laborUnitCost Removal)

### Does PERF-EXP-001 (XLSX) still hold given `create-proposal-workbook.ts` was edited?

**Yes — fully still holds.** The sibling edits are downstream of the finding's two cost surfaces:

1. **Double-buffer copy (`route.ts:128-131`).** The XLSX HTTP route file `route.ts` was **NOT touched** by the sibling diff. The `createXlsxResponse(buffer, filename)` function still allocates `new ArrayBuffer(buffer.byteLength)` and copies via `new Uint8Array(body).set(buffer)`. Peak-memory doubling is unchanged.

2. **STORE-mode ZIP (`xlsx-workbook.ts`).** The custom OOXML writer `xlsx-workbook.ts` was **NOT touched** by the sibling diff (`git diff --stat HEAD -- src/lib/proposal-export/xlsx-workbook.ts` → empty). The STORE-mode writer is intact.

3. **`create-proposal-workbook.ts` edits.** The sibling removed the `LABOR` column (`{ key:"labor", ... }`) and `COST TOTAL` column (`{ key:"costTotal", ... }`) from `BID_FORM_COLUMNS`, removed the `LABOR UNIT COST` / `LABOR SUBTOTAL` columns from `BREAKDOWN_COLUMNS`, removed the `LABOR_DISCLAIMER_NOTE` and its conditional header note, and shortened the `lineCostFormula` from `ROUND(qty*material,2)+ROUND(qty*labor,2)+adj` to `ROUND(qty*material,2)+adj`. **These changes do not touch the buffer-copy path or the ZIP writer.** They slightly *reduce* per-row output size (2 fewer cells per bid-form row), which marginally *improves* peak memory but does not change the 2× buffer-copy shape or the STORE-mode payload. The finding's recommendation (return the `Uint8Array` directly as the Response body) still applies unchanged.

**Net:** PERF-EXP-001 is unaffected by the sibling edit. The finding remains accurate; if anything, the sibling edit made the export marginally cheaper without resolving the structural issues.

### Does the `estimate-row-total.ts` change affect PERF-D1-001's `readRowById` cost analysis?

**No.** PERF-D1-001's cost claim is "up to 100 parallel single-row `SELECT` calls" on the idempotent restore-replay path. The cost driver is **D1 round-trip count**, not the per-row arithmetic.

- The source file `src/lib/estimates/d1-intents/rows.ts` was **NOT touched** by the sibling diff. `readRowById` at `:1697-1703` still does `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id = ? LIMIT 1`, and the replay path at `:3186-3192` still `Promise.all(map(readRowById))`.
- The sibling's `estimate-row-total.ts` edit only removes `labor_rate` parsing and `laborMinorUnits` accumulation from `computeEstimateRowCostParts` / `computeEstimateRowLineTotal`. This is **post-fetch CPU arithmetic in TS** — it runs after the row is already materialized in memory. It does not change the number of D1 statements issued, the query shape, or the index usage. The N-reads-on-replay problem is identical.
- `readRowById` calls `serializeRow` (`:725`, `:1703`), which maps raw D1 columns to the `EstimateRowRecord` shape; it does not read `labor_rate`/`laborUnitCost` from a typed column (labor was always read-side via `metadata.laborUnitCost` JSONB on the UI type, not the D1 record). So the serialize path is unaffected by the type change.

**Net:** PERF-D1-001's cost model is unchanged. The finding's recommendation (replace the per-row map with a batched `WHERE id IN (...)` mirroring `:3281-3285`) still applies verbatim.

### Are there NEW perf surfaces introduced by these concurrent edits?

**No.** Verified three ways:

1. **New D1 queries.** `git diff HEAD -- src/lib/ | grep -E '^\+.*\b(SELECT|INSERT|UPDATE|DELETE|prepare|\.bind|json_extract|json_each)\b'` returns **zero matches**. The sibling diff introduces no new SQL, no new prepared statements, no new JSON-extract correlations.

2. **Net line delta.** `+14 / −106` across the 12 files. This is a pure field-stripping change — every touched site is a deletion of a `labor*` field from a type, a normalization step, a column definition, or a formula. The handful of added lines are comment rewrites and a simplified `lineCostFormula`. There is no new module, no new provider, no new hook, no new component, no new route.

3. **Touched surfaces vs. finding surfaces.** None of the 12 modified files is the primary source for any of the 16 findings except PERF-EXP-001 (where `create-proposal-workbook.ts` is a secondary source and is unaffected in the way §(c) above shows). Specifically:
   - `estimate-row-total.ts` / `estimate-tree-read-repository.ts` / `estimates/types.ts` → not cited by any finding as the cost surface (PERF-D1-001 lives in `rows.ts`, untouched).
   - `project-charts/*` / `repositories/project-charts-repository.ts` → not cited by any finding.
   - `publication/{authoring-projection,snapshot}.ts` → not cited by PERF-PUB-001 (which lives in `publication/actions.ts`, untouched).
   - `ai/read-context.ts` → not cited by any finding.

### Minor citation corrections the audit should absorb

These are not drift in the code; they are inaccuracies in the first-pass register that this reconciliation surfaced:

1. **PERF-D1-003** — replace the citation `migrations/0026_cost_library_indexes.sql:67-73` with `migrations/0083_component_library_browse_cursor_index.sql:1-3` (the only real cost-library index migration; `0026` is a different file (`component_promotion_support`) and contains no `cost_library_items` index). Substantive claim unchanged.
2. **PERF-EXP-001** — tighten the STORE-mode line list from `xlsx-workbook.ts:230,613,662,684` to `xlsx-workbook.ts:613` (the local-file-header method field `writeUInt16(header, 8, 0)`); the other lines are not STORE-mode evidence. Substantive claim unchanged.

---

## (d) New Performance-Relevant Changes in the Drift

**None.** Concretely:

- **Committed drift (`a41a07d0..24b15e8`):** 8 commits, all `docs(ai):`, all confined to `.ai/`. No `src/`, `worker.ts`, `scripts/`, `.github/`, or build-config deltas. Zero new perf surfaces.
- **Uncommitted working-tree drift (laborUnitCost removal):** purely subtractive, no new SQL, no new providers, no new modules, no new routes, no new hooks. Zero new perf surfaces.
- **No new findings to add.** The 16 actionable findings in `05-FINDINGS-REGISTER.md` remain the complete, current set.

---

## Conclusion

The performance-audit pack is **fully reconciled** with HEAD `24b15e8` and the concurrent sibling working-tree edits.

- All 16 findings re-verify as **Still holds** against current code.
- Zero findings changed shape, were fixed, or became stale.
- The concurrent laborUnitCost-removal edits in `src/lib/` are purely subtractive and **do not affect any finding's cost model**, including PERF-EXP-001 (XLSX buffer-copy + STORE-mode both intact in untouched files) and PERF-D1-001 (rows.ts untouched; the estimate-row-total.ts change is post-fetch CPU arithmetic that does not alter D1 round-trip count).
- No new performance surfaces were introduced by either the committed drift or the uncommitted sibling edits.
- Two minor citation corrections are flagged for a future register revision (PERF-D1-003's migration filename; PERF-EXP-001's STORE-mode line list). Neither affects the substantive findings.

The audit pack can be treated as current and authoritative for HEAD `24b15e8`.
