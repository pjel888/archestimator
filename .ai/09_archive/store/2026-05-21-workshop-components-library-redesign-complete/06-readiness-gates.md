# Readiness Gates

**Date:** 2026-05-21
**Route:** `/workshop/components`
**Reference route:** `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777701`

## Gate A - Scope And Removal

Pass conditions:

- current standalone `/workshop/components` search row is removed;
- current disabled filter/group/new toolbar is removed;
- `Demo seed` is absent;
- dense table, facets, inspector, import/export, local manager adapter/helper layer remain absent;
- no right Component Library sidebar is rendered.

## Gate B - Workspace Mirror

Pass conditions:

- target route uses the estimate workspace pattern: left tree + center sheet;
- left tree width and visual treatment match the reference route;
- search boxes and icon rows appear in the same vertical locations as the reference tree and sheet;
- center sheet fills remaining width after right sidebar removal;
- app typography stays at or below 12px.

## Gate C - Tree Safety

Pass conditions:

- Categories and Suppliers tabs are present;
- tree selection updates local sheet state;
- selection does not navigate to estimate routes;
- no drag/drop props or affordances exist;
- no root drop zones exist;
- no add-node toolbar actions exist;
- no rename/delete context menu exists;
- no reorder status copy exists.

## Gate D - Component Sheet Semantics

Pass conditions:

- center rows represent custom user components;
- center sheet does not display estimate row fixture semantics as final product content;
- empty/no-results states are compact and route-specific;
- search filters component rows;
- row fields are ready for component-library data, even if editing is deferred.

## Gate E - Classification

Pass conditions:

- `P / P-FIX`, `LGT / LGT-FIX`, and `FFE / FFE-FUR` are encoded and tested;
- structural concrete defaults to `STR / STR-CONC`;
- site and finish contexts can route to `CIV` or `ARC`;
- taxonomy constants carry source ids and a `checkedAt` date.

## Visual Ralph Gate

Reference capture:

```txt
http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777701
```

Target capture:

```txt
http://localhost:3000/workshop/components
```

Viewports:

- desktop: `1440x900`;
- mobile: `390x844`.

Store artifacts under:

```txt
.omx/artifacts/visual-ralph/workshop-components-library-redesign/
```

Known allowed differences:

- no right sidebar on target route;
- custom component labels instead of estimate labels;
- category/supplier tree labels instead of estimate area labels;
- route title/breadcrumb context may differ.

Blocking differences:

- old standalone components page search/toolbar remains;
- left tree width/chrome differs without reason;
- sheet search/toolbar positions differ;
- right sidebar appears;
- target route looks like an admin manager instead of the estimate workspace.

If `$visual-verdict` is run, target score is `>= 90` after accounting for the allowed differences.

Persist verdict summaries in:

```txt
.omx/state/workshop-components-library-redesign/ralph-progress.json
```

## UltraQA Gate

Targeted cycle:

```bash
bunx vitest run tests/vitest/aec-classification.test.ts tests/vitest/component-library-manager-ui.test.tsx --maxWorkers=1
bun run type-check
bun run lint:font-size
git diff --check
```

Completion cycle:

```bash
bun run validate
```

If a command fails, diagnose by category:

- taxonomy failure;
- route-shell removal failure;
- layout/chrome failure;
- typography failure;
- stale test fixture failure.

Fix the smallest failing slice and rerun the failed command before widening the gate.

## Browser Evidence Gate

Record evidence that:

- reference route renders correctly;
- target route renders correctly;
- left panel width matches;
- center sheet x-position matches;
- center sheet reaches the right edge without a sidebar;
- no drag/drop affordance appears on hover/focus;
- tree tabs work;
- component sheet search works;
- no text overlaps or clips on desktop/mobile.

## Completion Stop Condition

Do not call the implementation complete until:

- Gates A-E pass;
- targeted Vitest passes;
- type-check passes;
- font-size lint passes;
- browser evidence is captured;
- Visual Verdict passes if a reference comparison is used;
- `.ai/10_state/current-state.md` reflects implemented reality.
