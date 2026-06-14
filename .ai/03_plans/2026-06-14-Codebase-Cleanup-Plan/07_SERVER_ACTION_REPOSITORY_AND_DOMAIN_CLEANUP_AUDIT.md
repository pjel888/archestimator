# 07 — Server Action / Repository / Domain Cleanup Audit

Covers `src/lib/**`. Method: per exported symbol, `rg "\b<name>\b" src tests e2e scripts` minus its own file, classifying callers as runtime/test/none. Security-sensitive modules (auth, publication, collaboration, share, proposal-export) are KEEP unless proven obsolete AND replaced.

---

### CLEAN-F04 — `cost-library-repository.ts` orphan file

Category: DEAD_CODE · Confidence: Safe delete · Severity: Medium
`src/lib/repositories/cost-library-repository.ts` (`costLibraryRepository`, `CostLibraryItem`, …): `rg "cost-library-repository"` → 0 hits outside the file. The `cost_library_items` table is read server-side in `component-library-repository.ts` and `component-library/actions.ts`. This browser-repo abstraction is fully superseded.
Action: delete file. DB: none. Risk: zero blast radius. Gate: `type-check`+`build`. Decision: DELETE_NOW (P0/P3).

---

### CLEAN-F05 — `domain/estimate-totals.ts` orphan duplicate

Category: DUPLICATE_CODE · Confidence: Safe delete · Severity: Medium
`src/lib/domain/estimate-totals.ts` (`calculateEstimateRowTotal`, `calculateEstimateTotal`): `rg "estimate-totals"` → 0 hits. Canonical is `src/lib/estimates/estimate-row-total.ts#computeEstimateRowLineTotal` (live, tested). Note: `domain/estimate-tree.ts` + `estimate-mutations.ts` ARE live (used by `estimate-repository.ts` + hooks) — only `estimate-totals.ts` is dead.
Action: delete file. DB: none. Risk: none. Gate: `type-check`+`build`. Decision: DELETE_NOW.

---

### CLEAN-F06 — Dead `createProject` / `deleteProject` wrappers

Category: DEAD_CODE · Confidence: Safe delete
`src/lib/projects/actions.ts`: `createProject` (thin `createProjectRecord()`+`redirect()`) has 0 callers — `NewProjectForm` calls `createProjectRecord` directly. `deleteProject` (single-project form action) is replaced by the bulk `preview/execute` flow; `mass-deletion-ui-contract.test.ts:33` asserts it is NOT form-bound.
Action: remove both exports. DB: none. Risk: low (guard test protects). Gate: `type-check`+`build`. Decision: DELETE_NOW.

---

### CLEAN-F08 — `componentLibraryDatasetVersion` unused

Category: UNUSED_EXPORT · Confidence: Safe delete
`src/lib/repositories/component-library-repository.ts`: 0 callers. Remove. Decision: DELETE_NOW.

---

### CLEAN-F16 — Test-only exports (oracles / telemetry)

Category: UNUSED_EXPORT · Confidence: Stale but referenced
Referenced only by tests (as equivalence oracles / regression anchors), no runtime caller:
- `buildProjectChartComparison`, `calculateProjectChartRowTotal` — `project-charts/aggregate-project-charts.ts`
- `buildProjectChartComparisonViewFromFacts` — `project-charts/project-comparison-view.ts`
- `summarizeProjectPublicationAccessTelemetryMetrics` — `publication/activity-helpers.ts`
- `fetchEstimateActivityRetentionMetrics` — `estimates/actions.ts`
The live chart path uses `buildProjectChartComparisonView` + `buildProjectChartSeries`.
Action: migrate tests to the live path, then remove the oracle exports. Risk: medium (test coupling). Decision: DELETE_AFTER_LOCAL_PROOF (P3).

---

### CLEAN-F17 — `aec-classification` module (MVP-cut candidate / OWNER_GATE)

Category: MVP_SCOPE_CUT · Confidence: MVP-cut candidate
`src/lib/aec-classification/disciplines.ts`: `rg "from.*aec-classification" src` → 0. Only `tests/vitest/aec-classification.test.ts` imports it. Speculative taxonomy with no runtime callsite.
Action: owner decides — keep as future spec or cut module+test. Decision: OWNER_GATE (P1).

---

### CLEAN-F18 — `ab-testing/results-calculator.ts` test-only

Category: DEAD_CODE · Confidence: Likely dead
`calculateResults` (chi-square): only `landing-ab-testing.test.tsx`. The rest of `ab-testing/**` IS live on landing (`variant-assigner`, `experiment-tracker`, `bot-patterns`, `experiments`). No analytics dashboard consumes results.
Action: remove `results-calculator.ts` + its test usage (or mark test-only). Decision: DELETE_AFTER_LOCAL_PROOF (P1/P3).

---

### CLEAN-F19 — AI inline totals duplicate (KEEP until AI decision)

`src/lib/ai/read-context.ts:740` inlines a third copy of the row-total formula. Only reachable when AI enabled. De-dupe to `computeEstimateRowLineTotal` if AI is kept. Decision: KEEP_FOR_NOW (P3 if AI kept).

---

### CLEAN-F07 — Follow-mode flag helpers unreachable (OWNER_GATE)

`src/lib/collaboration/feature-flags.ts`: `isFollowModeEnabled()` and `readTeamspaceFeatureFlags()` have **0 callers**. Follow mode is deferred (D-6). So the `NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE` flag is read only by a function nobody calls. Sibling flags (`isCursorBroadcastEnabled`, `isProjectPageCursorsEnabled`) ARE live — keep those.
Action: owner decides cut-follow-mode (remove helpers+flag) vs keep-staged. Decision: OWNER_GATE (P1).

---

## Module-level verdicts

| Module | Runtime-reachable? | Entry points | Verdict |
|---|---|---|---|
| `lib/ab-testing/**` | YES (landing) | `page.tsx`, Hero/FinalCTA/Header/PricingSection*/ABExperimentProvider | KEEP; `results-calculator` dead (*PricingSection is itself dead but ab-testing has other live callers) |
| `lib/aec-classification/**` | NO | tests only | MVP-cut candidate (F17) |
| `lib/ai/**` | Conditional (flags off) | `/api/ai/*`, `EstimateCopilotFloatingButton` | KEEP-deferred / owner gate (F25) |
| `lib/proposal-export/**` | YES | export route + `EstimateSheetContent` | KEEP (no dead exports) |
| `lib/publication/**` | YES | share API routes + publication components | KEEP (except test-only `summarize…Telemetry…` F16) |
| `lib/share/**` | YES | `SharePageTabs`, tree panels | KEEP |
| `lib/collaboration/**` | YES (security) | teamspace header, cursor/presence hooks, invite routes | KEEP (except dead follow-mode helpers F07) |
| `lib/auth/**` | YES (security) | proxy, callback, session, account | KEEP |

## KEEP despite looking stale (active corridor + security)

`estimate-schema-compat.ts` (`isMissingColumnError`/`isMissingRelationError`/`normalizeEstimateRecord`), `allowLegacyFallback` (export route + reusable-sources), `LEGACY_MAIN_TAB_ID`, `__legacy_default_tab__` sentinel in `duplicateEstimateSheet`, legacy compat blocks in `estimates/actions.ts` (`sheet_code`/`notes`/`project_budget`), `hashAccountSecurityValue`/`buildAccountSecurityAuditRow` (security contract, internal), `setEstimateFavorite` (schema+table exist; planned; schema test guards — product decision before removal), `domain/estimate-tree.ts`+`estimate-mutations.ts`. All load-bearing until the unification migration completes (P6/P7) or a product decision lands.
