# 2026-06-11 Path-To-Estimate-Sheet Performance Optimization Implementation Prompt

Copy/paste this entire prompt into a fresh codebase AI session running in `/Users/philiplewis/archestimator`.

You are operating as a senior principal engineer, performance engineer, product-minded implementation owner, QA engineer, release engineer, database/query reviewer, frontend responsiveness specialist, technical architect, documentation maintainer, and careful git/worktree operator for Archestimator.

This is a **full implementation task** for the plan pack at:

```text
/Users/philiplewis/archestimator/.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization
```

## North-Star Goal

Implement the complete performance and optimization plan so the path from landing page to estimate sheet feels seamless:

```text
/ -> /workshop/projects/[projectId]/estimates -> /workshop/projects/[projectId]/estimates/[nodeId]
```

The product goal is that every supported user path in this chain is fast, responsive, and behaviorally correct. Do not interpret "100% performance" as a license to make unsafe rewrites or fake claims. For this run, "100%" means:

1. Every implementation unit in `13-implementation-readiness-plan.md` is completed, explicitly deferred with evidence, or rejected with evidence because measurement proves it is unnecessary.
2. Baseline and after metrics exist for 50-, 200-, and 500-row sheets.
3. All behavior scenarios in `14-adversarial-qa-matrix.md` pass or are blocked only by an explicit owner/provider authority boundary.
4. The landing page, estimate list, project layout, and estimate sheet still work through real browser flows.
5. No protected auth, RLS, collaboration, proposal preview, cost editing, drag/drop, template insertion, publication, export, or activity-scope behavior is broken.
6. No test is weakened, skipped, deleted, or suppressed to make the suite green.
7. The active plan files are improved continuously as new evidence is found.
8. The completed plan pack is archived under `/Users/philiplewis/archestimator/.ai/09_archive` only after implementation, verification, review, and QA are complete.

Do not stop after one optimization if measurable bottlenecks remain. Loop, measure, fix, verify, and update the plan until the route is demonstrably fast and all required behavior still works.

---

## Mandatory Workflow Posture

Use the strongest available workflow support in the current environment:

- Use `$autopilot` semantics if the OMX runtime supports it: clarify only unresolved blockers, plan, execute through durable goals, review, and UltraQA.
- Use `$ultragoal` or equivalent durable goal tracking for multi-step implementation state.
- Use `$ultrawork` or equivalent parallel execution discipline for independent evidence lanes.
- Use `$ultraqa` or equivalent adversarial dynamic QA before claiming completion.
- Use `superpowers:test-driven-development` discipline for production behavior changes.
- Use `superpowers:verification-before-completion` discipline before final reporting.
- Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` if available for task-by-task execution.
- Use code-review and architectural review before claiming the work is complete.

If workflow keywords conflict or the runtime cannot activate a named workflow, do not stall. Record the limitation and execute the nearest safe equivalent directly:

```text
Workflow fallback: <mode unavailable/conflict>. Equivalent local discipline used: <durable checklist / plan / review / QA evidence>.
```

The runtime surface is an aid, not an excuse to skip proof.

---

## Hard Constraints

### Repository and Branch Safety

Repository:

```text
/Users/philiplewis/archestimator
```

Before editing, run and record:

```bash
pwd
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
```

Rules:

- Do not implement directly on `main`.
- If you are on `main`, create or switch to a dedicated implementation branch/worktree before source edits.
- Do not use `git reset --hard`.
- Do not use `git clean -fd`.
- Do not force push.
- Do not stage unrelated changes.
- Do not overwrite unrelated dirty files.
- Do not delete another active worktree.
- Do not delete local or remote branches unless the branch is merged and cleanup is explicitly safe.
- Do not merge or push `main` unless the current user prompt or a separate owner-approved instruction explicitly authorizes it for this run.
- If unrelated dirty files exist, leave them untouched and record them in the final report.

### Product Safety

- Do not weaken protected-route auth validation to gain speed.
- Do not relax RLS or provider security.
- Do not mutate linked Supabase, Vercel production, or external providers unless the user explicitly authorizes that exact provider action.
- Keep closed-beta cost posture intact unless the owner explicitly re-approves extra cost.
- Keep public/marketing cache behavior separate from protected app privacy.
- Do not add dependencies unless measurement proves the need and the plan explicitly permits the dependency.
- `@tanstack/react-virtual` is not approved by default. It is only allowed if post-Sprint 0-2 measurement proves DOM count remains the limiting bottleneck.
- Do not introduce `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Do not suppress lint/type/test failures.
- Do not delete or weaken failing tests.
- Do not fake metrics, screenshots, QA artifacts, provider proof, or review approval.

---

## Required Source-of-Truth Reading

Before source edits, read these in order:

```text
AGENTS.md
DESIGN.md
.ai/README.md
.ai/00_system/ai-folder-canonical-map.md
.ai/00_system/AGENT_OPERATING_PROTOCOL.md
.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md
.ai/10_state/current-state.md
.ai/10_state/decisions.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/README.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/00-executive-summary.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/12-current-evidence-and-gap-audit.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/13-implementation-readiness-plan.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/14-adversarial-qa-matrix.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/15-readiness-scorecard.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/16-dependency-cache-image-decision-matrix.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/17-blast-radius-and-impact-analysis-plan.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/08-measurement-protocol.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/06-prioritized-recommendations.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/09-code-pattern-analysis.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/01-rendering-path-audit.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/02-data-fetching-audit.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/03-client-side-bundle-ux-audit.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/04-infrastructure-audit.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/05-database-optimization-audit.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/10-landing-page-audit.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/11-estimate-list-audit.md
```

Then inspect the current source. Do not trust line numbers in plans until revalidated in the current branch.

Important current plan facts to verify:

- Route path uses `[nodeId]`: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`.
- `EstimateSheetContent.tsx` was 4,336 lines in the planning snapshot.
- The plan snapshot saw 14 `useEffect`, 23 `useMemo`, 33 `useState`, 32 `useCallback`, 7 `useRef`, and no `useTransition`, `useDeferredValue`, or `useOptimistic` in `EstimateSheetContent.tsx`.
- Repository `select("*")` count was 29, source-wide count was 48 in the planning snapshot.
- `listProjectEstimates()` no longer fetched row-item `source_snapshot` in the estimate-list path; the remaining issue was row transfer plus JavaScript aggregation and `estimates.select("*")`.
- Estimate-sheet tree loads still had JSONB overfetch candidates.
- `getCurrentWorkspaceComponentLibrary()` was eager in the estimate-sheet page load.
- Global `react-complex-tree` and Lenis CSS were imported globally.
- Landing auth display used a Supabase auth round-trip that must not be confused with protected-route auth.
- Redis/Upstash/KV were absent from `package.json`; do not add them unless the decision matrix's measured trigger is satisfied.
- `next.config.ts` had Supabase component-image `remotePatterns` and `sharp`; component thumbnails still used inline `backgroundImage`.
- Local Next 16 docs deprecate `next/image` `priority` in favor of `preload`; use `preload` only for the single true LCP hero candidate.

If any fact is stale, update the plan docs first, explain the correction, and proceed from current truth.

Before any dependency, cache, image, config, migration, or high-risk component change, read and apply:

```text
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/16-dependency-cache-image-decision-matrix.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/17-blast-radius-and-impact-analysis-plan.md
```

---

## Required Code Intelligence Before Editing

Before modifying any production symbol, use the available graph/code-intelligence tools required by `AGENTS.md`.

If `code-review-graph` is available, use it before raw grep for architecture and impact:

- `get_architecture_overview`
- `semantic_search_nodes` for the target symbol or file
- `get_impact_radius` for touched symbols
- `query_graph` for callers/callees/tests where relevant
- `detect_changes` before commit/review

If GitNexus is available and functioning, run impact analysis before editing functions/classes/methods:

```text
gitnexus_impact(target: "<symbol>", direction: "upstream")
```

If GitNexus fails, use `code-review-graph` plus manual source tracing, and record the fallback.

Do not edit a high- or critical-risk symbol until the risk is recorded and tests/QA cover the blast radius.

---

## Definition of Seamless Performance

Use measured evidence, not assumptions. The final run should target:

### Local Runtime Budgets

For 50-, 200-, and 500-row sheets:

- First route load has recorded TTFB, FCP, LCP, TBT, payload size, query count, and JS scripting time.
- Ten-character quantity edit has recorded average and worst-case keystroke responsiveness.
- 200-row sheet keystroke interaction should be visually immediate, target `<16ms` for the relevant local edit path after optimization.
- 500-row sheet should remain responsive with no obvious input lag, stale totals, cursor jumps, or focus loss.
- If virtualization is added, test at 500 and 1000 rows.

### Product Behavior Budgets

No performance improvement counts if it breaks:

- Quantity/unit/misc cost editing.
- Contingency and discount semantics.
- Formula calculation and project totals.
- Row add/delete.
- Template insertion.
- Component/library drag/drop.
- Bulk selection and hidden selection pruning.
- Remote cursor display and cleanup.
- Proposal preview signature updates.
- Activity scope updates.
- Estimate-list totals and row counts.
- Protected auth, workspace/project access, RLS, and closed beta gates.
- Landing CTA for anonymous and signed-in users.

### Claim Discipline

You may claim:

- Local measured improvement only when before/after local artifacts prove it.
- Hosted/provider improvement only when the route, deployment/window, device class, and source are captured.
- Database index benefit only when EXPLAIN before/after proves planner benefit.

You must not claim:

- Speed Insights or RES improvement without provider proof.
- Theoretical payload or latency improvement as measured fact.
- "Complete" while any QA matrix row is unrun, failed, or skipped without a documented safety boundary.

---

## Implementation Loop

Work in loops. Each loop has this shape:

1. Re-read the relevant plan unit and source files.
2. Revalidate current facts against source and graph/code-intelligence.
3. Write or update failing tests/characterization tests first.
4. Run the targeted test and capture RED or characterization baseline proof.
5. Implement the smallest correct change.
6. Run the targeted test and capture GREEN proof.
7. Run broader affected tests.
8. Run the relevant browser/manual QA scenario.
9. Capture before/after metric artifacts.
10. Update the plan docs with new evidence, stale assumption corrections, and next decisions.
11. Commit a coherent unit when it is green and reviewable.
12. Continue to the next unit only after the current unit has evidence.

Do not batch unrelated changes into `EstimateSheetContent.tsx`. Keep each change reviewable.

If a new issue appears, do not ignore it:

- If it blocks the performance path or behavior preservation, fix it in the current loop.
- If it is adjacent but not blocking, create a dated bug/task document under `.ai/15_Bugs` and reference it from the plan evidence.
- If it invalidates a plan assumption, update the active plan docs before continuing.

---

## Phase 0 - Baseline and Behavior Harness (Required First)

Do not edit performance code before U0 is complete.

### Commands and Artifacts

Create an evidence folder:

```bash
mkdir -p .ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation
```

Record static source snapshot:

```bash
{
  date -u
  git status --short --branch
  git rev-parse HEAD
  wc -l src/components/workshop/EstimateSheetContent.tsx
  rg -n "use(Effect|Memo|State|Callback|Ref|Transition|DeferredValue|Optimistic)" src/components/workshop/EstimateSheetContent.tsx
  rg -n '\.select\("\*"\)' src
  rg -n "getCurrentWorkspaceComponentLibrary|react-complex-tree/lib/style-modern.css|lenis/dist/lenis.css|getUser\\(" src
  rg -n "redis|Redis|upstash|KV|use cache: remote|cacheHandlers" package.json next.config.ts src .ai || true
  rg -n "from \\\"next/image\\\"|from 'next/image'|backgroundImage|priority|preload" src next.config.ts
} > .ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation/static-snapshot-before.txt
```

Start local services as needed:

```bash
npx supabase start
bun run dev
```

If the project already has a dev server or Supabase running, reuse it and record the port/status. Do not kill unrelated processes unless you started them and no longer need them.

Create or identify fixtures:

- 50-row estimate sheet.
- 200-row estimate sheet.
- 500-row estimate sheet.
- Record project ID, estimate ID, node ID, branch, commit, row count, linked-row count, and fixture source.

Use existing fixture tools where available:

```bash
bun run perf:seed-fixture
```

If the script is incompatible with this plan, update or add a scoped fixture generator only after writing tests/characterization for expected data shape.

Fill the baseline table in:

```text
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/08-measurement-protocol.md
```

Store raw artifacts under:

```text
.ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation/baseline/
```

Required artifacts:

- Browser trace or Playwright trace for first load.
- Browser trace or Playwright trace for ten-character quantity entry.
- Network HAR or request log with payload totals.
- Static snapshot.
- Test output for characterization coverage.
- Git status before/after.

### Characterization Tests

Before optimizing, add or confirm tests for:

- Quantity edit preserves displayed value and total.
- Unit cost edit updates totals.
- Misc cost edit updates totals.
- Contingency adds; discount subtracts.
- Empty/invalid numeric input keeps current validation semantics.
- Row add/delete preserves tree and totals.
- Template insert preserves ordering and totals.
- Drag/drop preserves tree structure.
- Bulk selection prunes hidden selections correctly.
- Remote cursor overlay renders and times out without stealing focus.
- Proposal preview signature updates after row edits.
- Activity scope updates after edits.

Likely test files:

```text
tests/vitest/estimate-sheet-cost-inputs.test.tsx
tests/vitest/estimate-sheet-tree-dom.test.tsx
tests/vitest/estimate-tree-context-menu.test.tsx
tests/vitest/estimate-template-drop-zones.test.tsx
tests/vitest/tree-external-drop.test.tsx
tests/vitest/new-template-modal.test.tsx
```

Run targeted tests first:

```bash
bun run test:dom -- tests/vitest/estimate-sheet-cost-inputs.test.tsx
bun run test:dom -- tests/vitest/estimate-sheet-tree-dom.test.tsx
bun run test:dom -- tests/vitest/estimate-tree-context-menu.test.tsx
```

Then run the broader DOM suite when the first unit is stable:

```bash
bun run test:dom
```

U0 is complete only when baseline evidence and characterization coverage exist.

---

## Phase 0A - Blast Radius and Package/Cache/Image Decision Gate

Do this before Phase 1 and before any package, cache, image, config, migration, repository, or high-risk component edit.

Read:

```text
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/16-dependency-cache-image-decision-matrix.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/17-blast-radius-and-impact-analysis-plan.md
```

Create decision/evidence receipts under:

```text
.ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation/decisions/
```

Required receipts before code:

1. **Blast radius receipt** for every production source unit:
   - target files/symbols;
   - code-review graph / GitNexus commands used;
   - fallback manual tracing if graph tools are unavailable;
   - callers, consumers, tests, routes, and provider surfaces;
   - targeted verification mapped to the blast radius.
2. **Redis / remote-cache decision receipt**:
   - default decision is "do not add";
   - identify whether a measured shared-cache problem exists;
   - classify data as public/shared, protected/user-specific, or derived;
   - define keys, TTL, invalidation, stale-data UX, cost, provider authority, and fallback if a remote cache is proposed.
3. **Image decision receipt**:
   - list every `backgroundImage`, `next/image`, `priority`, and `preload` surface on the path;
   - decide which thumbnails should migrate to `next/image`;
   - prove URLs match `next.config.ts` `remotePatterns` or route through an existing image API;
   - require `fill` + stable container + `sizes`;
   - replace Next 16 `priority` with `preload` only for the single LCP hero candidate.
4. **Package/config decision receipt**:
   - no new package without measured metric target and rollback;
   - no `@tanstack/react-virtual` until post-Sprint 0-2 DOM bottleneck proof;
   - no `optimizePackageImports` additions without `ANALYZE=true bun run build` before/after evidence;
   - no cache handler or provider package without cost and secret/env review.

Stop and update the plan if:

- Redis/remote cache is proposed for protected estimate data.
- A package install is proposed without route-level metric proof.
- An image rewrite cannot preserve layout/accessibility.
- A graph or manual blast-radius check finds broader impact than the current unit covers.

---

## Phase 1 - Safe Render Relief

Source plan unit: U1.

Goal:

- Reduce avoidable sheet re-renders without changing input scheduling.
- Do not introduce `useDeferredValue` in this phase.

Likely files:

```text
src/components/workshop/EstimateSheetContent.tsx
tests/vitest/estimate-sheet-cost-inputs.test.tsx
tests/vitest/estimate-sheet-tree-dom.test.tsx
```

Required work:

1. Add render-count instrumentation in tests or a temporary harness.
2. Prove the current render cascade or establish the real current behavior.
3. Add `React.memo` around `EstimateRowItemsTable` only if prop identity and callbacks are safe.
4. Memoize `projectTotal` or equivalent expensive total derivation.
5. Verify totals, callbacks, edits, row add/delete, and drag/drop still work.

Required evidence:

- RED/characterization output before memoization.
- GREEN output after memoization.
- Browser or Playwright trace for ten-character quantity entry before/after.
- Render-count proof for edited and non-edited row tables.

Stop if:

- Memoization causes stale row data or stale callbacks.
- Render-count proof shows no measurable value and adds complexity.

If stopped, update the plan with evidence and move to the next higher-value unit.

---

## Phase 2 - Data Payload, Query Shape, and Cache Discipline

Source plan units: U2, U3, U5.

### U2 Explicit Column Selection

Likely files:

```text
src/lib/repositories/workspace-repository.ts
src/lib/repositories/component-library-repository.ts
tests/vitest/*repository*.test.ts
```

Required work:

1. Locate path-relevant `select("*")` calls.
2. Replace only confirmed overfetch with explicit column lists.
3. Preserve TypeScript return shapes without `as any`.
4. Fetch `source_snapshot` only where linked row/source display behavior requires it.
5. Add or update repository tests proving required fields remain present.

Required evidence:

- Before/after `rg -n '\.select\("\*"\)' src`.
- Network payload before/after for 50/200/500-row sheets.
- Estimate sheet opens and linked/unlinked rows display correctly.

Cache rule:

- Do not add Redis/Upstash/KV for estimate-sheet tree data.
- Do not add `use cache: remote` for protected estimate data.
- If a derived shared snapshot is proposed later, pause and write an ADR with invalidation, permission-change behavior, stale-data UX, and provider cost.

### U3 Estimate-List Aggregate

Likely files:

```text
src/lib/repositories/workspace-repository.ts
supabase/migrations/*
tests/vitest/estimate-list*.test.ts
```

Required work:

1. Preserve existing arithmetic semantics exactly.
2. Move estimate-list row count/total aggregation to SQL/RPC/view only if tests prove parity.
3. Keep a rollback path until parity is proven.
4. Cover empty estimates, discount rows, null values, and RLS-accessible projects.

Required evidence:

- Old JavaScript aggregate output vs new aggregate output parity.
- Payload reduction for a 50-estimate x 100-row fixture.
- Browser estimate-list page still shows correct counts/totals.

Cache rule:

- Prefer Postgres aggregate/RPC/view over distributed cache.
- Redis is only reconsidered if SQL/RPC cannot meet targets and the derived summary is privacy-safe, invalidatable, and owner-approved.

### U5 Index Proof

Do not apply linked-provider migrations without explicit owner/provider authority.

Required work:

1. Run EXPLAIN before proposing indexes.
2. Add local migration only for indexes with planner evidence.
3. Run EXPLAIN after migration.
4. Test migration idempotence and RLS neutrality.

Required evidence:

- Redacted local EXPLAIN before/after.
- Migration test output.
- Provider apply status: skipped unless explicitly authorized.

---

## Phase 3 - Component Library Lazy Load

Source plan unit: U4.

Likely files:

```text
src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx
src/components/workshop/EstimateWorkspaceClient.tsx
src/components/workshop/component-library/index.tsx
src/lib/component-library/actions.ts
tests/vitest/component-library-ui.test.tsx
```

Goal:

- The estimate sheet should open without eagerly loading the full component-library dataset when the right sidebar is closed.

Required work:

1. Write a test or Playwright/network assertion that current initial sheet load fetches or prepares library data.
2. Move library loading behind sidebar open.
3. Add skeleton, error, retry, and cached second-open behavior.
4. Keep template/component drag/drop behavior intact.

Required evidence:

- Initial sheet request/query count drops.
- Sidebar first-open loads content successfully.
- Sidebar close/reopen uses cache or avoids unnecessary repeat load.
- Error state is visible and does not block sheet editing.
- Drag/drop from library/templates into sheet still works.

Cache rule:

- Start with lazy load plus client/session/TanStack cache.
- Do not add Redis/remote cache unless first-open and repeated-open metrics remain above budget after lazy load, and the shared catalog data has an invalidation plan.

---

## Phase 4 - Landing, Global CSS, and Auth Display

Source plan unit: U6.

Likely files:

```text
src/app/layout.tsx
src/app/workshop/layout.tsx
src/app/page.tsx
src/components/landing/*
src/lib/auth/*
src/proxy.ts
```

Goal:

- Reduce anonymous landing first-paint overhead without weakening protected auth.

Required work:

1. Scope `react-complex-tree` CSS to workshop if feasible.
2. Scope Lenis CSS to landing only if feasible.
3. Replace landing auth display round-trip with a neutral CTA or display-only hint if measurement proves value.
4. Replace Next 16 `priority` with `preload` for the single LCP hero image only if the trace confirms it is the LCP candidate.
5. Keep protected route `getUser()` validation and fail-closed semantics intact.
6. Verify closed-beta and terms gates still behave correctly.

Required evidence:

- Anonymous `/` browser trace/HAR before/after.
- Signed-in CTA to `/workshop` works.
- Protected route still validates securely.
- No redirect loops.
- CSS still renders correctly in workshop tree components.
- Landing image network trace proves no unnecessary preloads or oversized responsive images.

---

## Phase 5 - React 19 Scheduling, Optimistic State, and Cursor Isolation

Source plan units: U7, U8.

Likely files:

```text
src/components/workshop/EstimateSheetContent.tsx
src/hooks/use-estimate-row-mutations.ts
src/hooks/use-estimate-cursor-broadcast.ts
tests/vitest/estimate-sheet-cost-inputs.test.tsx
tests/vitest/estimate-sheet-tree-dom.test.tsx
```

Goal:

- Improve keystroke responsiveness and collaboration isolation only after safe render relief and characterization are already green.

Required work:

1. Evaluate `useDeferredValue` only after input focus, tab order, rollback, proposal preview, and activity scope tests exist.
2. Keep immediate cell drafts separate from deferred expensive derivations if scheduling is introduced.
3. Evaluate `useOptimistic` only if it preserves revision guards and rollback semantics.
4. Isolate cursor overlay state/rendering so cursor traffic does not re-render sheet rows.
5. Reduce pointer-move DOM traversal only if profiling proves it matters.

Required evidence:

- Rapid typing test.
- Tab-away and blur commit test.
- Failed server action rollback test.
- Proposal preview and activity scope parity test.
- Remote cursor while typing test.
- Render-count proof for cursor updates.
- 200-row keystroke trace reaches the chosen responsiveness budget.

Stop if:

- Cursor jumps.
- Focus is lost.
- Deferred state creates stale totals or stale previews.
- Rollback corrupts tree/rows.

If stopped, revert the risky scheduling change, keep safe improvements, and update the plan.

---

## Phase 6 - Component Split

Source plan unit: U9.

Likely files:

```text
src/components/workshop/EstimateSheetContent.tsx
src/components/workshop/estimate-sheet/*
tests/vitest/estimate-sheet-*.test.tsx
```

Goal:

- Split `EstimateSheetContent.tsx` into smaller components after behavior, data, and scheduling work are stable.

Rules:

- This is not a redesign.
- Extract one boundary at a time.
- Run tests after each extraction.
- Do not combine extraction with behavior changes.
- Prefer names and folder structure that match existing workshop conventions.

Suggested extraction order:

1. Header/status/actions.
2. Body/tree/table boundary.
3. Footer/totals.
4. Modals/dialogs.
5. Sidebar/library boundary.

Required evidence:

- Tests pass after each extraction batch.
- Browser estimate-sheet flow still works.
- No new circular imports.
- LSP/typecheck clean.

---

## Phase 7 - Virtualization Only If Still Needed

Source plan unit: U10.

Virtualization is not automatically approved. It is allowed only if post-U1 through U9 metrics prove DOM count remains the limiting bottleneck.

If virtualization is unnecessary, update the plan with:

```text
Virtualization skipped: Sprint 0-2/structure measurements met budgets without adding dependency.
```

If virtualization is necessary:

1. Document why existing optimizations were insufficient.
2. Get or record dependency approval for `@tanstack/react-virtual`.
3. Add the dependency only after approval/evidence.
4. Implement variable-height measurement, overscan, focus preservation, drag/drop mapping, bulk selection support, and cursor coordinate mapping.
5. Test 500- and 1000-row sheets.

Required evidence:

- Keyboard editing survives row recycling.
- Drag/drop zones work.
- Bulk selection includes off-screen rows correctly.
- Remote cursors map to virtualized rows.
- Print/export paths are unaffected.
- Keystroke responsiveness and paint/memory improve against pre-virtualization measurements.

---

## Required Adversarial QA Matrix

Before final completion, execute or safely block every row from:

```text
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/14-adversarial-qa-matrix.md
```

Minimum required scenarios:

- QA-BASE-001: Open 50/200/500-row sheets and record first load plus ten-character quantity edit.
- QA-BASE-002: Record static source snapshot and dirty worktree.
- QA-BLAST-001: Pre-edit graph/GitNexus/manual impact analysis and post-diff `detect_changes` where available.
- QA-PKG-001: Package/config changes pass the decision matrix before install/edit.
- QA-CACHE-001: Redis/Upstash/KV/remote-cache proposals are rejected or approved with measured trigger, invalidation, privacy safety, and cost evidence.
- QA-IMAGE-001: Inline component thumbnail image rewrites use `next/image` only with URL, network, layout, and accessibility proof.
- QA-SHEET-001: Type `1000000000` quickly into quantity, tab away, verify value and totals.
- QA-SHEET-002: Empty/invalid numeric input validation/rollback.
- QA-SHEET-003: Contingency/discount semantics.
- QA-SHEET-004: Add row, delete row, insert template, failed mutation rollback.
- QA-SHEET-005: Bulk selection with hidden/filter/search changes.
- QA-SHEET-006: Component/template drag/drop and tree moves.
- QA-CURSOR-001: Remote cursor broadcasts while typing.
- QA-LIB-001: Open sheet without opening library; initial render skips library dataset fetch.
- QA-LIB-002: Open library later; skeleton/content/cache/error behavior works.
- QA-LIST-001: Large project estimate-list aggregate parity and payload.
- QA-DB-001: EXPLAIN before/after for proposed indexes.
- QA-LANDING-001: Anonymous landing load has no blocking auth round-trip after fix.
- QA-LANDING-002: Signed-in user can enter workshop with protected auth intact.
- QA-PROVIDER-001: Production route metrics only if deployment/provider authority exists.
- QA-DIRTY-001: Unrelated dirty files are preserved.

For each QA row, record:

```text
ID:
Command/tool:
Setup:
Expected signal:
Actual signal:
Status: PASS | FAIL | BLOCKED
Evidence path:
Cleanup:
```

Evidence belongs under:

```text
.ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation/qa/
```

Do not count a green unit test as a substitute for a browser-facing QA scenario.

---

## Required Verification Commands

Run targeted commands as each unit changes, then run the broad set before final completion.

Likely broad verification:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run lint:design
bun run test
bun run test:dom
bun run build
```

Run Playwright/e2e where browser behavior is changed:

```bash
bun run test:e2e
```

Run performance route checks where relevant:

```bash
bun run perf:measure-routes
bun run perf:check-routes
bun run perf:profile-peak-load
```

If a command is unavailable, too slow, or blocked by environment, record:

```text
Command:
Status: NOT RUN
Reason:
Safe substitute:
Residual risk:
```

Do not hide pre-existing failures. Classify them:

- pre-existing and unrelated;
- caused by this work;
- uncertain and must be investigated.

Fix every failure caused by this work.

---

## Continuous Plan Improvement Requirement

As you implement, improve the active plan pack. Do not treat the plan as frozen if source reality changes.

Update these files as evidence develops:

```text
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/08-measurement-protocol.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/12-current-evidence-and-gap-audit.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/13-implementation-readiness-plan.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/14-adversarial-qa-matrix.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/15-readiness-scorecard.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/16-dependency-cache-image-decision-matrix.md
.ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization/17-blast-radius-and-impact-analysis-plan.md
```

Also update durable project state when reality changes:

```text
.ai/10_state/current-state.md
.ai/10_state/decisions.md
```

If you discover a new bug or follow-up outside the direct performance path, create a dated issue plan under:

```text
.ai/15_Bugs
```

Each plan update must include:

- What changed.
- Evidence path.
- Whether it changes execution order.
- Whether it blocks completion.

---

## Commit Discipline

Make small, meaningful commits. Do not commit unrelated dirty work.

Suggested commit groups:

1. Baseline fixtures and characterization tests.
2. Safe render relief.
3. Data query/column selection.
4. Estimate-list aggregate.
5. Component-library lazy load.
6. Landing/global CSS/auth display.
7. Scheduling/cursor isolation.
8. Component split.
9. Virtualization if approved and necessary.
10. Final evidence, plan updates, archive move.

Commit messages must follow the repo's Lore protocol where applicable:

```text
<intent line: why the change was made, not what changed>

Constraint: <external constraint that shaped the decision>
Rejected: <alternative considered> | <reason for rejection>
Confidence: <low|medium|high>
Scope-risk: <narrow|moderate|broad>
Directive: <forward-looking warning for future modifiers>
Tested: <what was verified>
Not-tested: <known gaps in verification>
```

Do not push or merge `main` unless current-run authority explicitly permits it.

---

## Completion and Archive Requirement

Do not archive the plan pack until all implementation, verification, review, and QA gates are complete.

When complete, archive the active plan folder into:

```text
/Users/philiplewis/archestimator/.ai/09_archive/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization
```

Preferred command after final completion is proven:

```bash
git mv \
  .ai/03_plans/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization \
  .ai/09_archive/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization
```

If `git mv` is unsafe because of branch/worktree state, do not force it. Record the blocker and keep the plan active.

Create a final completion receipt:

```text
.ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation/completion-receipt.md
```

The receipt must include:

- Branch and commit range.
- Baseline artifact paths.
- Final after-metric artifact paths.
- QA matrix status table.
- Test/build/lint/typecheck command outputs summarized with exit codes.
- Browser/manual QA evidence paths.
- Provider evidence or provider-skip reason.
- Database migration evidence or migration-skip reason.
- Plan files archived path.
- Known residual risks.
- Confirmation that unrelated dirty files were preserved.

After archive, update:

```text
.ai/10_state/current-state.md
.ai/10_state/decisions.md
```

The final plan status must say:

```text
Implemented and archived. Performance claims are supported by the evidence paths listed in the completion receipt.
```

---

## Final Review Gate

Before final response:

1. Run code-intelligence `detect_changes` if available.
2. Run an independent code review or code-review workflow.
3. Resolve every finding or record a true blocker.
4. Run adversarial QA after review fixes.
5. Re-run final verification commands.
6. Confirm no QA processes, dev servers, browser contexts, or temp harnesses remain unless intentionally left running and documented.
7. Confirm the plan pack has been archived only if fully implemented.

Completion is blocked if:

- Any required behavior scenario fails.
- Any caused-by-this-work test/build/type/lint failure remains.
- Any provider or database claim lacks scoped evidence.
- The archive did not happen and there is no documented blocker.
- The app only works in tests but fails through the browser path.
- The implementation achieves speed by breaking correctness.

---

## Final Report Format

Return a concise but complete report:

```markdown
# Path-To-Estimate-Sheet Performance Implementation Report

## Status
- COMPLETED | COMPLETED_WITH_PROVIDER_BLOCKERS | BLOCKED
- Branch:
- Commit range:
- Archived plan path:
- Completion receipt:

## Performance Evidence
| Metric | Baseline | Final | Delta | Evidence |
|--------|----------|-------|-------|----------|

## Behavior / QA Evidence
| QA ID | Status | Evidence |
|-------|--------|----------|

## Verification Commands
| Command | Exit | Evidence / key output |
|---------|------|-----------------------|

## Files Changed
- Grouped by implementation unit, not a raw dump.

## Plan Improvements Made Along the Way
- List stale assumptions corrected and new docs/tasks added.

## Provider / Database Authority
- What was run locally.
- What was skipped because it required owner/provider authority.

## Residual Risks
- Only true residual risks, with owner/action needed.

## Unrelated Dirty Work Preserved
- List any unrelated files that were dirty before and left untouched.
```

Do not say "100% complete" unless the report proves every criterion above.

Start now by reading the source-of-truth docs and the full plan pack, then execute U0 before any performance code edits.
