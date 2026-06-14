# Templates Panel Projects-As-Templates Performance Plan

Date: 2026-06-14
Owner: Codex
Surface: Right sidebar Templates tab, Projects section

## Goal

Make projects-as-templates feel instant at closed-beta scale: fast initial population, fast search, no duplicate heavy tree work, and a visibly nested tree where project, estimate, tab, and area levels are easy to scan.

## Success Criteria

- Opening the Templates tab does not rebuild project-source trees more than needed.
- Searching reusable project sources runs in linear time over resident/search results.
- Bulk-selection metadata reuses already-built tree shape instead of constructing a second project tree.
- Expanding warmed project/estimate nodes remains fetch-idempotent and skeleton-based for cold paths.
- Project source rows show clearer hierarchy indentation without changing other tree consumers.
- Targeted tests cover structure, indentation, and the large-list project-source filter path.

## Current Findings

- `TemplatesTree` builds a JSX-bearing project tree for display, then `buildTemplatesSelectionNodes` builds another project tree for bulk-selection metadata.
- `filterProjectSourcesByQuery` scans the full source array inside the match loop for project, estimate, and tab matches, creating quadratic work as project/template sources grow.
- `buildProjectSourceTreeNodes` replaces tab node arrays with `filter(...).concat(...)` for every node source, creating quadratic work within loaded outlines.
- Template category lookup for context/drag filters the full template list each time a category is used.
- The shared `Tree` has a fixed 16px indent step. This works for narrow trees, but the Templates Projects section has multiple semantic levels with icon-less dot rows, so the selected panel reads too flat.

## Implementation Loop

1. Add a reusable project-source tree build result that returns display nodes and selection nodes from one normalized pass.
2. Replace nested project-source search scans with indexed descendant lookups.
3. Make project node grouping dedupe in maps and materialize arrays once.
4. Add an optional `indentStep` prop to the shared `Tree`, defaulting to 16px, and use a wider templates-only step.
5. Add focused Vitest coverage for indentation and large resident project-source filtering.
6. Run targeted tests, then browser-smoke the current estimate page in the in-app browser.

## Follow-Up Measurement Ideas

- Add a tiny dev-only profiler around Templates tree build time if the panel still feels slow with production-sized data.
- Consider server-side search caps/pagination if real workspaces exceed the resident-source assumptions.
- Consider row virtualization only if measured DOM row count, not tree construction, becomes the bottleneck.

## 2026-06-14 Continuation: Nested Project Nodes and Rows

Fresh inspection found the first performance pass had made the renderer/indexing fast, but project-node sources were still flattened as direct tab children. That meant UI indentation could only separate project -> estimate -> tab -> node, not true node -> child node hierarchy.

Additional implementation:

- `ProjectNodeReusableSource` now carries `parentNodeId` and direct `rowItems`.
- Reusable-source outline/search collectors preserve parent links and direct component rows.
- The Templates project-source tree links node groups through maps and materializes root nodes once, then renders nested project nodes plus direct component rows.
- Project node rows no longer show visible `Group` / `Area` meta text in the tree.
- Standalone project component rows can be selected, dragged, context-added, and bulk-added like component-library rows; checked tabs/nodes still dedupe descendants to avoid double insertion.

Fresh verification:

- `bunx vitest run tests/vitest/templates-tree-performance.test.ts tests/vitest/component-library-ui.test.tsx tests/vitest/ui-tree.test.tsx --maxWorkers=1` passed: 3 files / 86 tests.
- `bun run type-check` passed.
- Changed-file `bun run lint -- ...` passed.
- `git diff --check` passed.
- Browser smoke in a fresh Playwright/Chrome context reached localhost but redirected to `/login`; authenticated visual proof remains session-gated.
