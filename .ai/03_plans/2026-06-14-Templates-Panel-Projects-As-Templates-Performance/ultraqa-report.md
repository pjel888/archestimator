# UltraQA Report

## Goal and success criteria

- Goal: verify the Templates tab Projects section is faster and correctly indented after the project-as-template optimization pass.
- Stop condition: targeted behavior, adversarial data-shape cases, type/lint hygiene, and dirty-worktree handling have fresh evidence.
- Safety bounds applied: no production writes, no destructive git cleanup, no secret reads, no forced browser-session takeover.

## Scenario matrix

| ID | User/attacker model | Scenario | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|----|---------------------|----------|-----------------|-----------------|---------------|--------|----------|---------|
| UQA-001 | Normal estimator with many projects | Large resident project-source list searches by project name without quadratic scans | `bunx vitest run tests/vitest/templates-tree-performance.test.ts --maxWorkers=1` | Large-list helper test passes under bounded runtime | 1 file / 5 tests passed in 2.62s | Pass | `filters large resident project-source lists with indexed descendants` | Permanent test intentionally kept |
| UQA-002 | Normal estimator selecting nested project source | Matching a single project node keeps project, estimate, tab, and node ancestors only | Same harness | Ancestor chain is exact | Passed | Pass | `keeps a matching project node with only its ancestors` | Permanent test intentionally kept |
| UQA-003 | Hostile prompt/search text | Search text contains instruction-like string, interpolation markers, Unicode bidi, and repeated oversized input | Same harness | No throw, no unrelated source leakage | Passed | Pass | `handles hostile search text without throwing or leaking unrelated sources` | Permanent test intentionally kept |
| UQA-004 | Stale/duplicated provider result | Duplicate project-node source appears in resident data | Same harness | Tree materializes one latest node | Passed | Pass | `dedupes duplicate project-node sources before materializing the tree` | Permanent test intentionally kept |
| UQA-005 | UI scanner | Templates project, estimate, tab, and area levels visually separate | `bunx vitest run tests/vitest/ui-tree.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1 -t "indent|project-derived source|project sources"` | Templates rows use 20/40/60/80px indentation; shared tree override works | 2 files passed, 10 passed / 68 skipped in 8.25s | Pass | DOM style assertions on `[data-tree-indent]` | Permanent tests intentionally kept |
| UQA-006 | Regression checker | Shared tree default consumers keep 16px unless overridden | Same UI harness | Default indent test still passes | Passed | Pass | `indents content per depth...` and override test | Permanent tests intentionally kept |
| UQA-007 | Dirty-worktree safety | Existing unrelated user edits must not be hidden or reverted | `git status --short --branch` before and after | Unrelated dirty files remain visible | Status shows unrelated modified/untracked files preserved | Pass | Status output recorded in chat; no reset/checkout used | No cleanup; unrelated work preserved |
| UQA-008 | Misleading success output guard | Validate exit codes, not success-looking strings | All commands checked by tool exit code | Exit code 0 required | Vitest/typecheck/eslint/diff-check exited 0 | Pass | Tool outputs include exit code 0 | No cleanup |
| UQA-009 | Browser/session proof | Smoke selected logged-in page | `curl -I` + attempted Codex app inspection | Safe substitute if auth blocks fresh browser | localhost reachable; fresh request redirects to `/login`; Computer Use cannot inspect Codex app | Blocked-safe | HTTP 307 to login, Computer Use safety refusal | No browser artifacts created |
| UQA-010 | Stale runtime hook state | Stop hook still reports UltraQA planning after normal clear | `find .omx/state -name 'ultraqa-state.json'`; `omx state clear --input '{"mode":"ultraqa","all_sessions":true}' --json` | No active/session UltraQA state remains | 8 stale session files removed; subsequent find empty and `active_modes: []` | Pass | `omx state read` false, `omx state list-active` empty | State cleanup completed through OMX |

## Commands run

- `[0] bunx vitest run tests/vitest/templates-tree-performance.test.ts --maxWorkers=1` — adversarial performance/helper harness; 1 file / 5 tests passed.
- `[0] bunx vitest run tests/vitest/ui-tree.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1 -t "indent|project-derived source|project sources"` — targeted UI hierarchy and project-source DOM proof; 2 files passed, 10 passed / 68 skipped.
- `[0] bun run type-check` — TypeScript proof.
- `[0] bunx eslint src/components/ui/tree.tsx src/components/workshop/component-library/index.tsx src/components/workshop/component-library/tree/TemplatesTree.tsx tests/vitest/ui-tree.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/templates-tree-performance.test.ts` — changed-surface lint proof.
- `[0] git diff --check` — whitespace hygiene.
- `[0] curl -I --max-time 5 http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db` — server reachable but unauthenticated redirect to `/login`.
- `[0] omx state clear --input '{"mode":"ultraqa","all_sessions":true}' --json` — removed 8 stale UltraQA session state files after the stop hook kept reporting planning.
- `[0] find .omx/state -name 'ultraqa-state.json'` — no output after cleanup.
- `[0] omx state read --input '{"mode":"ultraqa"}' --json && omx state list-active --json` — `exists:false`, `active_modes:[]`.

## Failures found

- UQA-009: authenticated visual browser proof is blocked from this environment. Safe substitute used: DOM tests plus localhost reachability; no product defect inferred.

## Fixes applied

- `TemplatesTree.tsx`: indexed project-source filtering, map-backed node grouping, memoized category lookup, tree-derived selection metadata, scoped wider indent.
- `component-library/index.tsx`: loaded project-source index for hover/expand prefetch checks.
- `tree.tsx`: optional `indentStep` prop with unchanged 16px default.
- Tests: large-list, malformed search, duplicate node dedupe, selection-tree shape, and DOM indentation coverage.

## Cleanup and rollback

- No temporary harness files were created.
- Permanent tests and report are intentional artifacts.
- Unrelated dirty files remain untouched and visible in `git status`.
- OMX UltraQA state cleared after this report, including 8 stale session-scoped UltraQA files via `all_sessions:true`.

## Residual risks

- Logged-in, real-browser visual proof remains session-gated.
- Server-side search pagination/caps remain a follow-up if production workspaces outgrow resident-source assumptions.

## Evidence

- Fresh UltraQA evidence: 5/5 performance/helper tests, 10/10 targeted UI tests, TypeScript, ESLint, and diff-check all passed. Follow-up stale-state cleanup evidence: no `ultraqa-state.json` files remain and `omx state list-active` is empty.

## Continuation Evidence: Nested Project Nodes and Component Rows

Follow-up inspection found a remaining data-shape bug: project-source nodes had no parent id or direct row-item payload, so true project node hierarchy was flattened under each tab. The continuation fixed that by carrying `parentNodeId` and `rowItems` through reusable-source collectors, linking project node groups with maps, rendering nested project nodes and direct component rows, and deduping bulk insertion when checked ancestors cover descendants.

Additional adversarial cases now covered:

- Nested project node materialization does not flatten child nodes.
- Direct project component rows render under the owning project node.
- Visible `Group` / `Area` metadata is removed from project node tree rows.
- Indentation proves project -> estimate -> tab -> parent node -> child node/component row at 20/40/60/80/100px.
- Checked parent project nodes suppress duplicate checked child nodes/rows.
- Standalone checked project component rows bulk-add through the component insertion path without inserting the parent project source.

Fresh final commands:

- `[0] bunx vitest run tests/vitest/templates-tree-performance.test.ts tests/vitest/component-library-ui.test.tsx tests/vitest/ui-tree.test.tsx --maxWorkers=1` — 3 files / 86 tests passed in 67.70s.
- `[0] bun run type-check` — passed.
- `[0] bun run lint -- src/components/workshop/component-library/tree/TemplatesTree.tsx src/components/workshop/component-library/index.tsx src/lib/reusable-sources/types.ts src/lib/reusable-sources/source-collectors.ts tests/vitest/templates-tree-performance.test.ts tests/vitest/component-library-ui.test.tsx` — passed.
- `[0] git diff --check` — passed.
- Fresh browser smoke via Playwright + local Chrome reached `localhost:3000`, but the unauthenticated context redirected the selected workshop URL to `/login`; no authenticated visual claim is made.
