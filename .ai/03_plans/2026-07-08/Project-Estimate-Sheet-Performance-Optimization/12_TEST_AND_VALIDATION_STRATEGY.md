# 12 - Test And Validation Strategy

## Existing Tests To Preserve

Targeted existing suite:

```bash
bunx vitest run \
  tests/vitest/estimate-sheet-large-data-budgets.test.ts \
  tests/vitest/estimate-row-table-virtualization.test.tsx \
  tests/vitest/estimate-branch-virtualization.test.tsx \
  tests/vitest/perf/estimate-sheet-render-baseline.test.tsx \
  tests/vitest/perf/estimate-sheet-render-relief.test.tsx \
  tests/vitest/perf/estimate-sheet-memoization.test.tsx \
  tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx \
  --maxWorkers=1
```

## New Test Matrix

| Layer | Proposed Path | Required Behaviors |
|---|---|---|
| Source fingerprint | `tests/vitest/estimate-sheet-source-fingerprint.test.ts` | Typed/runtime output matches the v2 reference under conflicting locale and local/global Git config; fixed application/producer scopes include `public/`; NUL/UTF-8/mode/content records are deterministic; package-script-only changes alter producer but not application; dependency/runtime changes alter application; the pre-edit planning admission gate is distinct from post-edit current comparison. |
| Report schema | `tests/vitest/estimate-sheet-performance-contract.test.ts` | Complete tagged reports, incomplete attempts, fixture, test receipt, mode proof, discriminated local-preview/local-D1/hosted-D1 cleanup, hosted-recovery, route/full integration, graph/derived-state/render-a11y/mutation unit proof, decision, supersession, release, and index schemas enforce required/forbidden fields, dual fingerprints, exact build semantics, metric-level skip rules, cleanup eligibility, and rejection of unknown/hybrid/incomplete/even-null records. |
| Test receipts | `scripts/lib/estimate-sheet-performance-test-receipt.ts`, `scripts/lib/estimate-sheet-vitest-reporter.ts`, `e2e/helpers/estimate-sheet-performance-reporter.ts` | Conditional reporter activation, exact normalized argv/file lists, no-overwrite same-run output roles, equal pre/post source fingerprints, worker/retry/count/result capture, crash-to-attempt behavior, redaction, and fixture-bound `fixtureMutation` provenance with rejection of missing, dirty, reused, failed, stale, wrong-role, or cross-fingerprint receipts. |
| Command receipts | `scripts/run-estimate-sheet-performance-gate.ts` | Allowlisted normalized commands/roles, non-secret path env, no-overwrite same-run output, equal pre/post source fingerprints, exclusive exit/signal, output/diagnostic hashes, build/artifact hashes, interruption attempts, and rejection of mutating, stale, failed, duplicate, wrong-command, wrong-build, cross-run, or cross-fingerprint receipts. |
| Fixture unit | `tests/vitest/estimate-sheet-performance-fixtures.test.ts` | Deterministic fixture tiers, redacted IDs, three graph metrics, constructible reciprocal payload/bundle hashes, mutation rejection on either member/linkage field, immutable no-overwrite pair production, and final-file index hashes. |
| Selector unit | `tests/vitest/estimate-graph-selectors.test.ts` | Graph selectors equal recursive helpers. |
| Totals unit | `tests/vitest/estimate-graph-totals.test.ts` | Incremental totals equal full recompute. |
| DOM perf | `tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx` | 1k/2.5k/5k logical rows mount bounded windows. |
| DOM perf | `tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx` | Keystroke p95/worst, focus, sibling render count. |
| Route contract | `tests/vitest/estimate-sheet-route-large-data-contract.test.ts` | Route uses load limits and truncation UI remains capped. |
| D1 local proof | `tests/vitest/estimate-sheet-d1-performance.test.ts` | SQL shape, query count, plan, row-read budget. |
| Browser | `e2e/estimate-sheet-performance.spec.ts` | Route, scroll, edit, search, expand, move, cursor metrics. |
| Browser | `e2e/estimate-sheet-component-interop.spec.ts` | All 19 interop IDs plus focus, DnD, resize, and responsive contracts. |
| Provider proof | `scripts/measure-estimate-sheet-d1.ts` | Local D1-compatible query and cleanup proof. |
| Better Auth proof | `tests/vitest/cloudflare-better-auth-proof-script.test.ts` | Installed helper emits the current eight statements and exact `user`/`session`/`account`/`verification`/`rateLimit` table set. |
| Run lifecycle | `tests/vitest/estimate-performance-run-lifecycle.test.ts` | UUID/current-pointer/immutable-root allocation and collision rejection; missing/ambiguous unit-pointer refusal; role-isolated mode/browser/D1 namespaces from one logical checkpoint; every missing evidence directory child/parent fsync; generated Better Auth DDL before active migrations; idempotent `0041`; five-table/auth/env/port validation; exact nonblocking UNIT-002 all-off baseline preview; report-before-cleanup timing; process journal before every launch; complete multi-preview stop/drain/exit/closed-port outcomes; role/table cleanup; response-loss recovery; crash-before-receipt; and cleanup invalidation. |
| Mode/rollback | `tests/vitest/estimate-performance-modes.test.ts` | Five server-only modes, constructible `estimate-sheet-mode-proof.v1`, explicit off/shadow/on/rollback, mixed-client/in-flight semantics, single-write mutation shadow, every intermediate preview closed, explicit final `on|all-activated` preview left active and bound to browser/cleanup, exact same-run joins, and proof that a mode child cannot substitute for browser proof. |
| Proof envelopes | `tests/vitest/estimate-sheet-performance-contract.test.ts` | Route-D1/full-local integration and graph/derived-state/render-a11y/mutation unit-proof envelopes accept only required `{role,schemaId,immutablePath,sha256}` children with one run/fingerprint pair; reject missing, failed, duplicate, scope-substituted, cross-run, cross-fingerprint, dirty-checkpoint, absent/mismatched test-receipt mutation blocks, undeclared mutation, reused namespace, and missing/failed command children; require complete browser reports for render-a11y/full-local only. |
| Evidence index | `tests/vitest/estimate-performance-evidence-index.test.ts` | Producer cannot target a current projection; immutable paths never overwrite; 13 evidence projections and the registry equal immutable sources; `dependencySources` recursively reopen/hash every child and cleanup receipt; delete/mutate-between-check/index fails; registry has no self-entry/hash and its external hash is journal/manifest verified; history, absent-state recovery, and every mkdir/fsync/rename/unlink/commit boundary are fault-tested. |
| Hosted proof | `scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts` | Direct remote `ARCH_DB` SQL proof; directory creation/fsync from durable `.ai/`; one `cleanup.json` lease/journal before seed; explicit-run recovery with multiple unresolved manifests; separate non-indexable hosted cleanup-recovery schema; crash/response-loss invalidation; and no canonical proof output from cleanup-only. |
| Release evaluator | `scripts/write-estimate-sheet-release-evaluation.ts` | Joins integrated local, hosted D1, and global release-gate inputs into deterministic UTF-8/LF `estimate-sheet-release-evaluation.v1` Markdown; strict parsing, payload-hash verification, canonical re-render byte equality, and unchanged projection are tested. |

## Component Interoperability Test Matrix (see doc 22)

Component interop has partial vitest coverage; seven of the 19 named IDs have no direct named test, and none has the required browser proof. See doc 22 for the reconciled list.

### Existing Local Coverage (vitest, jsdom)

| Suite | Tests | Covers |
|---|---|---|
| `estimate-sheet-library-insert.test.tsx` | 38 | library insert, variant persistence, express init, template insert, move/rollback, project-component fan-out, detach, promote |
| `library-add-component-modal-a11y.test.tsx` | 21 | AddComponentModal OpenDesign field contract, duplicate suppression, catalogue storage |
| `workshop-library-consolidation-ui.test.tsx` | 13 | Add Component modal submit with categorized variants, folder tree, versioned components |
| `estimate-image-url.test.ts` | 2 | image URL normalization / sanitization |
| `estimate-sheet-actions-authz.test.ts` | 17 | every estimate action auth-gated |
| `estimate-sheet-version-control-actions.test.ts` | 33 | history, conflict, stale library source blocking, restore (throws), detach authz |

### New Browser Proof Required (Phase 0.5)

| Proposed Path | Scenarios | Required Behaviors |
|---|---|---|
| `e2e/estimate-sheet-component-interop.spec.ts` | All 19 IDs in doc 22 | Create/edit/inline for both component types; variant persistence; fan-out; thumbnail routing; detach; promote; D1 row restore plus node-restore regression |

### New Unit/Integration Gaps to Close

| Layer | Proposed Path | Required Behaviors |
|---|---|---|
| Unit | `tests/vitest/estimate-component-fan-out.test.ts` | `patchProjectComponentInstanceRowsInTree` finds all matching instances by identity; rollback restores all; O(N) today, O(1) target |
| Unit | `tests/vitest/estimate-link-state-transitions.test.ts` | `linkState` flips to `linked-overridden` on library-linked edit; `detached` on detach; master unchanged |
| Unit | `tests/vitest/estimate-component-identity.test.ts` | `getProjectComponentIdentity` resolves correctly across all 4 priority buckets |
| Integration | `tests/vitest/estimate-three-edit-surfaces.test.ts` | AddComponentModal create → `cost_library_items`; edit → `estimate_row_items`; EditComponentDrawer → `cost_library_items` master; no cross-contamination |
| Scale | `tests/vitest/perf/estimate-sheet-fan-out-budget.test.tsx` | Project-component edit at 2,500/5,000 rows; fan-out p95 ≤ 75ms (pre/post graph index) |

## Fixture Distribution

Rows:
- 70% supplier/library rows.
- 20% project-specific rows.
- 10% express component rows.

Units:
- `pc`
- `sqm`
- `lot`
- `box`

Shape:
- 5-10 top groups.
- 10-100 areas.
- Uneven row counts.
- Long names/descriptions every 7th row.
- Attachment/detail metadata every 11th row.
- Deep branch path in each stress fixture.

## Browser Scenarios

- Cold direct route open.
- Warm hover prefetch then click.
- Scroll from top to bottom of stress fixture.
- Edit quantity in first, middle, and last visible row.
- Search for a row that appears near the bottom.
- Toggle supplier/category facets.
- Group by supplier/category/cost.
- Expand/collapse deep area.
- Move row to area with many rows.
- Activate express editor in a large table.
- Resize a column.
- Trigger remote cursor update while typing.

## D1 Proof Surfaces

- Route context by selected node id.
- Route context by selected tab id.
- Active tab tree.
- Subtree by node id.
- Row update.
- Row move.
- Bulk row delete.
- Proposal preview/export tree materialization, if touched.

## Validation Commands

Canonical unit commands supersede the older phase commands. The exact UNIT-001 through UNIT-003 command excerpts are:

```bash
node .ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs --verify
bun run perf:estimate:prepare -- --unit=UNIT-001 --profile=limit --artifact-only --cleanup-not-applicable
bun run perf:estimate:gate -- --unit=UNIT-001 --role=fingerprint-reference --output=auto:fingerprint-reference -- bun run perf:estimate:fingerprint -- --compare-reference=.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs
ESTIMATE_PERF_UNIT=UNIT-001 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/cloudflare-better-auth-proof-script.test.ts tests/vitest/estimate-sheet-source-fingerprint.test.ts tests/vitest/estimate-sheet-performance-fixtures.test.ts tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-performance-contract.test.ts tests/vitest/estimate-performance-run-lifecycle.test.ts tests/vitest/estimate-performance-modes.test.ts tests/vitest/estimate-performance-evidence-index.test.ts tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/estimate-sheet-bottleneck-decision.test.ts tests/vitest/estimate-sheet-hosted-d1-performance-proof-script.test.ts tests/vitest/estimate-sheet-release-evaluation.test.ts
bun run perf:estimate:gate -- --unit=UNIT-001 --role=typecheck --output=auto:typecheck -- bun run type-check
bun run perf:estimate:gate -- --unit=UNIT-001 --role=error-handling --output=auto:error-handling -- bun run validate:error-handling
bun run perf:estimate:measure -- --unit=UNIT-001 --profile=limit --evidence-class=jsdom --budget-policy=record-only --tests=auto:dom-tests --gates=auto:fingerprint-reference,auto:typecheck,auto:error-handling --fixture-output=auto:fixture --output=auto:jsdom --no-build --no-browser --no-local-run
bun run perf:estimate:index -- --unit=UNIT-001 --evidence=auto:fixture --project=evidence/runtime/fixture-manifest.json --also=auto:jsdom --also-project=evidence/runtime/jsdom-baseline.json --status=VERIFIED --cleanup-not-applicable
```

```bash
bun run perf:estimate:prepare -- --unit=UNIT-002 --profile=limit --port=auto
bun run perf:estimate:validate-run -- --unit=UNIT-002
bun run perf:estimate:gate -- --unit=UNIT-002 --role=opennext-build --output=auto:opennext-build -- bun run cf:build
bun run perf:estimate:server -- --unit=UNIT-002 --fixture-role=browser --phase=baseline-all-off --final-state=all-off --build-receipt=auto:opennext-build --background
ESTIMATE_PERF_UNIT=UNIT-002 ESTIMATE_PERF_FIXTURE_ROLE=browser ESTIMATE_PERF_TEST_OUTPUT_ROLE=e2e-tests ESTIMATE_PERF_OUTPUT_ROLE=browser bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0
```

```bash
bun run perf:estimate:gate -- --unit=UNIT-002 --role=browser-check --output=auto:browser-check -- bun run perf:estimate:check -- --unit=UNIT-002 --evidence=auto:browser --evidence-class=local-browser --budget-policy=record-only --tests=auto:e2e-tests --gates=auto:opennext-build --source-build-match=required
```

```bash
bun run perf:estimate:cleanup -- --unit=UNIT-002
bun run perf:estimate:index -- --unit=UNIT-002 --evidence=auto:browser --project=evidence/runtime/browser-baseline.json --status=VERIFIED --gate=auto:browser-check --cleanup-receipt=auto:cleanup
```

```bash
bun run perf:estimate:prepare -- --unit=UNIT-003 --profile=limit --port=auto
bun run perf:estimate:validate-run -- --unit=UNIT-003
ESTIMATE_PERF_UNIT=UNIT-003 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/workspace-repository-estimate-scoped-access.test.ts
bun run perf:estimate:d1 -- --unit=UNIT-003 --local --profile=limit --fixture-role=d1 --tests=auto:dom-tests --output=auto:d1
bun run perf:estimate:gate -- --unit=UNIT-003 --role=d1-check --output=auto:d1-check -- bun run perf:estimate:check -- --unit=UNIT-003 --evidence=auto:d1 --evidence-class=local-d1 --budget-policy=record-only
bun run perf:estimate:cleanup -- --unit=UNIT-003
bun run perf:estimate:index -- --unit=UNIT-003 --evidence=auto:d1 --project=evidence/runtime/d1-local-baseline.json --status=VERIFIED --gate=auto:d1-check --cleanup-receipt=auto:cleanup
```

After React implementation changes:

```bash
bun run perf:estimate:gate -- --unit=<UNIT-006..UNIT-010> --role=react-doctor --output=auto:react-doctor -- bun run doctor
```

Final local source hygiene:

```bash
git diff --check
```

## Evidence Standards

- A local jsdom test proves render logic only.
- A local browser test proves Chrome interaction behavior only.
- A local D1/SQLite proof proves local query shape and planner behavior only.
- A hosted D1 proof is required for production/provider claims.
- Hosted D1 proof is direct Wrangler SQL/provider evidence; it does not prove a deployed application route.
- A required-cleanup runtime unit is not `VERIFIED` until exact cleanup has passed and the journaled evidence transition commits; a producer/checker pass before cleanup is insufficient. Artifact-only `NOT_APPLICABLE` is accepted only after prepare and index both prove that every cleanup-owned resource and mutation declaration is empty.
- Baseline `overall=FAIL` is valid measured evidence when `--budget-policy=record-only` proves collection integrity; `VERIFIED` describes evidence lifecycle, while `UNIT-004` consumes the preserved failures. Every post-baseline optimization/integration/release checker enforces `overall=PASS`.
- A recovered uncertain delete may prove cleanup and release a lease, but it invalidates the interrupted producer; hosted proof and release status require a fresh uninterrupted run.
- Producers write immutable run paths; 13 stable names are current evidence projections and the fourteenth is the current registry. None is source evidence, and the registry's own hash is external rather than cyclic.
- Every projected envelope keeps durable child references; the index recursively revalidates those bytes plus cleanup and stores ordered `dependencySources[]` in registry history.
- Mutating mode, browser, and D1 commands use distinct prepared namespaces with one logical pre-state digest; no later child may inherit another child's mutation state.
- Every launched preview has a durable process-journal outcome, and browser proof binds to the explicit final `on|all-activated` preview rather than the rollback/off process.
- Baseline artifacts compare one frozen application/producer pair. Every later admission matches both predecessor outputs; activated units record owned application and product-test producer deltas, superseded units change neither scope, and Units 010-011 share the final pair. The staged lineage, not the historical planning fingerprint, governs runtime evidence.
- No one check substitutes for another evidence class.
