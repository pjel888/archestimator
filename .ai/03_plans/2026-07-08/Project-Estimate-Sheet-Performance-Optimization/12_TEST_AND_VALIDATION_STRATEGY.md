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
| Fixture unit | `tests/vitest/estimate-sheet-performance-fixtures.test.ts` | Deterministic fixture tiers and redacted IDs. |
| Selector unit | `tests/vitest/estimate-graph-selectors.test.ts` | Graph selectors equal recursive helpers. |
| Totals unit | `tests/vitest/estimate-graph-totals.test.ts` | Incremental totals equal full recompute. |
| DOM perf | `tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx` | 1k/2.5k/5k logical rows mount bounded windows. |
| DOM perf | `tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx` | Keystroke p95/worst, focus, sibling render count. |
| Route contract | `tests/vitest/estimate-sheet-route-large-data-contract.test.ts` | Route uses load limits and truncation UI remains capped. |
| D1 local proof | `tests/vitest/estimate-sheet-d1-performance.test.ts` | SQL shape, query count, plan, row-read budget. |
| Browser | `e2e/estimate-sheet-performance.spec.ts` | Route, scroll, edit, search, expand, move, cursor metrics. |
| Browser | `e2e/estimate-sheet-component-interop.spec.ts` | All 19 interop IDs plus focus, DnD, resize, and responsive contracts. |
| Provider proof | `scripts/measure-estimate-sheet-d1.ts` | Local D1-compatible query and cleanup proof. |
| Run lifecycle | `tests/vitest/estimate-performance-run-lifecycle.test.ts` | UUID root and route IDs, per-unit lease, shared `--persist-to`, freshly compiled Better Auth DDL with exact `user`/`session`/`account`/`verification`/`rateLimit` table set, allowlist/current legal acceptance/signed session/profile/membership validation, port allocation, and exact cleanup. |
| Mode/rollback | `tests/vitest/estimate-performance-modes.test.ts` | Five server-only modes, explicit off/shadow/on/rollback phases, mixed-client/in-flight semantics, single-write mutation shadow. |
| Evidence index | `tests/vitest/estimate-performance-evidence-index.test.ts` | Durable trace IDs, source/build hashes, reciprocal links, atomic verified/superseded transition. |
| Hosted proof | `scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts` | Direct remote `ARCH_DB` SQL proof, eleven-table exact cleanup, and no-deploy boundary. |
| Release evaluator | `scripts/write-estimate-sheet-release-evaluation.ts` | Joins integrated local, hosted D1, and global release-gate inputs into the declared release artifact. |

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
| `e2e/estimate-sheet-component-interop.spec.ts` | All 19 IDs in doc 22 | Create/edit/inline for both component types; variant persistence; fan-out; thumbnail routing; detach; promote; restore limitation |

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

Canonical unit commands supersede the older phase commands. The principal runnable commands are:

```bash
bun run test:dom -- tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx
```

```bash
bun run perf:estimate:prepare -- --unit=UNIT-002 --profile=limit --port=auto
bun run perf:estimate:validate-run -- --unit=UNIT-002
bun run cf:build
ESTIMATE_PERF_UNIT=UNIT-002 bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0
```

```bash
bun run perf:estimate:measure -- --profile=limit --evidence-class=local-browser
```

```bash
bun run perf:estimate:check -- --evidence-class=local-browser
```

```bash
bun run perf:estimate:prepare -- --unit=UNIT-003 --profile=limit --port=auto
bun run perf:estimate:d1 -- --unit=UNIT-003 --local --profile=limit
bun run perf:estimate:cleanup -- --unit=UNIT-003
```

After React implementation changes:

```bash
bun run doctor
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
- No one check substitutes for another evidence class.
