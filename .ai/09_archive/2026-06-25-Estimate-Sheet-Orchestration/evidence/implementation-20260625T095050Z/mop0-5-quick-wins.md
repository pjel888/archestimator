---
title: MOP-0.5 Quick UI/A11Y Evidence
type: evidence
date: 2026-06-25
status: active
---

# MOP-0.5 Quick UI/A11Y Evidence

## Scope

Implemented the package-approved quick wins only:

- Stable side-panel ID plus collapse-toggle `aria-controls`.
- Visible estimate-tree empty-state copy plus Add Area CTA.
- Copy-only below-desktop estimate-workspace fallback notice.

No mutation authority, drag/drop, shared tree primitive keyboard behavior,
server action, migration, telemetry sink, persistence, drawer, or responsive
layout behavior was changed in this slice.

## RED Evidence

Command:

```bash
bun x vitest run tests/vitest/resizable-side-panel-a11y.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx --maxWorkers=1
```

Result before implementation: failed as expected.

- Missing side-panel `id`/`aria-controls` relationship.
- Missing estimate-tree empty-state copy.
- Missing below-desktop fallback `role="note"` copy.

## GREEN Evidence

Commands after implementation:

```bash
bun x vitest run tests/vitest/resizable-side-panel-a11y.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/project-dashboard-side-panel-ui.test.ts tests/vitest/estimate-side-panel-rails.test.ts --maxWorkers=1
bun run type-check
git diff --check
```

Results:

- Focused MOP-0.5 tests: passed, 3 files / 14 tests.
- Adjacent side-panel governance tests: passed, 2 files / 6 tests.
- Type-check: passed.
- `git diff --check`: passed.

Vitest runs emitted the known Node `module.register()` deprecation warning; no
test failed on that warning.
